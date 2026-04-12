import random as rnd
import time
import logging
import json
import os
import re
import uuid
import threading
import requests
from requests.adapters import HTTPAdapter
from flask import Flask, request, jsonify
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
from groq import Groq

logging.getLogger("spotipy").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

load_dotenv()

app    = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

sp = spotipy.Spotify(
    auth_manager=SpotifyClientCredentials(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
    ),
    requests_timeout=8
)

adapter = HTTPAdapter(max_retries=0)
sp._session.mount("http://", adapter)
sp._session.mount("https://", adapter)

BPM_RANGES = {
    "low":    (50,  85),
    "medium": (85,  115),
    "high":   (115, 200),
}
DEFAULT_FEATURES = {
    "low":    {"tempo": 70,  "energy": 0.25, "valence": 0.4},
    "medium": {"tempo": 100, "energy": 0.5,  "valence": 0.5},
    "high":   {"tempo": 135, "energy": 0.8,  "valence": 0.65},
}

CACHE_FILE  = "audio_features_cache.json"
PLAYLIST_DB = "playlists_db.json"


class TokenBucket:
    def __init__(self, capacity, rate):
        self.capacity  = capacity
        self.rate      = rate
        self.tokens    = capacity
        self.last_time = time.monotonic()
        self._lock     = threading.Lock()

    def acquire(self, tokens=1.0):
        with self._lock:
            now            = time.monotonic()
            elapsed        = now - self.last_time
            self.tokens    = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_time = now
            if self.tokens >= tokens:
                self.tokens -= tokens
                return
            wait        = (tokens - self.tokens) / self.rate
            time.sleep(wait)
            self.tokens = 0

spotify_bucket = TokenBucket(capacity=10, rate=5)


def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass

_feature_cache = load_cache()


def load_playlists():
    if os.path.exists(PLAYLIST_DB):
        try:
            with open(PLAYLIST_DB, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_playlist(playlist_id, data):
    db = load_playlists()
    db[playlist_id] = data
    try:
        with open(PLAYLIST_DB, "w") as f:
            json.dump(db, f)
    except Exception:
        pass


def parse_json_safe(text):
    text = re.sub(r"```(?:json)?\s*", "", text).strip().replace("```", "").strip()
    return json.loads(text)


def is_artist_track(track, artist_name):
    target   = artist_name.lower().strip()
    credited = [a["name"].lower().strip() for a in track.get("artists", [])]
    for name in credited:
        if name == target:
            return True
    return False


def parse_request(user_text: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # ← back to 70b for parsing only
            messages=[
                {"role": "system", "content": "Return only JSON. If the user mentions a music artist or band name, always set the artist field to that name."},
                {"role": "user", "content": f"""
Analyze: "{user_text}"
Return:
{{
  "artist": "name or null",
  "mood": "mood",
  "context": "context",
  "energy": "low/medium/high",
  "genre_hint": "genre"
}}
"""}
            ],
            temperature=0,
            max_tokens=150,
        )
        result = parse_json_safe(response.choices[0].message.content)
        if not result.get("artist") or str(result["artist"]).lower() in ("null", "none", ""):
            result["artist"] = None
        if result.get("energy") not in ("low", "medium", "high"):
            result["energy"] = "medium"
        return result
    except Exception:
        return {"artist": None, "mood": "general", "context": "general",
                "energy": "medium", "genre_hint": "pop"}


def expand_queries(parsed):
    artist  = parsed.get("artist")
    mood    = parsed.get("mood", "general")
    context = parsed.get("context", "general")
    energy  = parsed.get("energy", "medium")
    genre   = parsed.get("genre_hint", "pop")

    try:
        if artist:
            prompt = f"""Give 8 short Spotify search queries to find songs by "{artist}" that match this vibe:
            - Mood: {mood}
            - Context: {context}  
            - Energy: {energy}

            Tailor every query to the mood/context/energy above.
            Examples: if context=club use "{artist} club", "{artist} banger", "{artist} dance"
                    if context=sad use "{artist} sad", "{artist} emotional", "{artist} heartbreak"
                    if context=study use "{artist} chill", "{artist} focus", "{artist} low key"
                    if energy=high use upbeat/hype queries
                    if energy=low use mellow/slow queries

            No full song titles. No feat. syntax. No artist: prefix.
            Return ONLY a JSON array of 8 strings."""
        else:
            prompt = f"""Give 8 short Spotify search queries to find songs that match this vibe:
            - Mood: {mood}
            - Context: {context}
            - Energy: {energy}
            - Genre: {genre}

            Tailor every query to the mood/context/energy above.
            Examples: if context=club use "dance {genre}", "club {genre} banger", "party {genre} hits"
                    if context=sad use "sad {genre}", "emotional {genre}", "heartbreak {genre}"
                    if context=study use "focus {genre}", "chill {genre}", "lo-fi {genre}"
                    if energy=high use upbeat/hype queries
                    if energy=low use mellow/slow/ambient queries

            Explore subgenres, mix eras, avoid only mainstream artists.
            No artist: prefix. Short phrases only.
            Return ONLY a JSON array of 8 strings."""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Return only a JSON array of strings."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.8,
            max_tokens=250,
        )
        raw     = response.choices[0].message.content
        raw     = re.sub(r"```(?:json)?\s*", "", raw).strip().replace("```", "").strip()
        queries = json.loads(raw)
        if isinstance(queries, list) and len(queries) >= 3:
            queries = [q.replace("artist:", "").strip() for q in queries]
            return queries[:8]
    except Exception:
        pass

    if artist:
        return [
            f"{artist}",
            f"{artist} hits",
            f"{artist} {mood}",
            f"{artist} {genre}",
            f"{artist} {context}",
            f"{artist} 2020",
            f"{artist} best",
            f"{artist} songs",
        ]
    return [
        f"{mood} {genre}",
        f"{context} {genre}",
        f"{mood} {genre} {context}",
        f"{genre} {energy}",
        f"{mood} vibes",
        f"underground {genre} {mood}",
        f"{genre} indie {mood}",
        f"{context} {mood} music",
    ]


def fetch_audio_features_safe(track_ids, energy_level):
    global _feature_cache
    defaults     = DEFAULT_FEATURES[energy_level]
    features_map = {}

    uncached = []
    for tid in track_ids:
        if tid in _feature_cache:
            features_map[tid] = _feature_cache[tid]
        else:
            uncached.append(tid)

    for i in range(0, len(uncached), 20):
        batch = uncached[i:i + 20]
        try:
            fetched = sp.audio_features(batch)
        except Exception:
            fetched = None

        result_list = fetched if fetched else [None] * len(batch)
        for tid, f in zip(batch, result_list):
            entry = {
                "tempo":   f.get("tempo",   defaults["tempo"])   if f else defaults["tempo"],
                "energy":  f.get("energy",  defaults["energy"])  if f else defaults["energy"],
                "valence": f.get("valence", defaults["valence"]) if f else defaults["valence"],
            }
            features_map[tid]   = entry
            _feature_cache[tid] = entry

    save_cache(_feature_cache)
    return features_map


def score_track(track, mood, energy, bpm_min, bpm_max):
    score   = 0
    reasons = []

    bpm       = track.get("bpm", 0)
    target    = (bpm_min + bpm_max) / 2
    bpm_score = max(0, 50 - abs(bpm - target))
    score    += bpm_score
    if bpm_score >= 40:
        reasons.append(f"🔥 BPM match ({int(bpm)})")
    elif bpm > 0:
        reasons.append(f"🎵 BPM: {int(bpm)}")

    energy_val = track.get("energy", 0)
    if energy == "low":
        e_score = (1 - energy_val) * 20
        if e_score > 14: reasons.append("😌 Chill energy")
    elif energy == "high":
        e_score = energy_val * 20
        if e_score > 14: reasons.append("⚡ High energy")
    else:
        e_score = (1 - abs(0.5 - energy_val)) * 20
        if e_score > 14: reasons.append("🎯 Energy match")
    score += e_score

    valence = track.get("valence", 0)
    if mood in ("sad", "melancholy", "dark", "heartbreak"):
        v_score = (1 - valence) * 20
        if v_score > 12: reasons.append("🌧️ Sad vibe")
    elif mood in ("happy", "upbeat", "euphoric", "party"):
        v_score = valence * 20
        if v_score > 12: reasons.append("🌟 Happy vibe")
    else:
        v_score = (1 - abs(0.5 - valence)) * 10
    score += v_score

    popularity = track.get("popularity", 50)
    if 30 < popularity < 75:
        score += 15
        reasons.append("💎 Hidden gem")
    elif popularity > 85:
        score -= 25
    elif popularity < 15:
        score -= 10

    score += rnd.uniform(0, 5)
    return score, reasons


@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        data      = request.get_json(force=True)
        user_text = data.get("text", "").strip()

        parsed  = parse_request(user_text)
        artist  = parsed["artist"]
        mood    = parsed["mood"]
        context = parsed["context"]
        energy  = parsed["energy"]

        queries = expand_queries(parsed)
        print(f"artist={artist} | queries={queries}")
        rnd.shuffle(queries)

        all_tracks = []
        seen_ids   = set()

        for query in queries:
            try:
                spotify_bucket.acquire()
                results = sp.search(
                    q=query, type="track",
                    limit=10, offset=0, market="IN"
                )
            except Exception:
                continue

            for track in results["tracks"]["items"]:
                if track["id"] in seen_ids:
                    continue
                if artist and not is_artist_track(track, artist):
                    continue
                seen_ids.add(track["id"])
                all_tracks.append(track)

        if not all_tracks:
            return jsonify({"playlist": [], "mood": mood, "context": context, "energy": energy})

        all_tracks   = all_tracks[:50]
        track_ids    = [tr["id"] for tr in all_tracks if tr.get("id")]
        features_map = fetch_audio_features_safe(track_ids, energy)

        bpm_min, bpm_max = BPM_RANGES[energy]
        raw_playlist     = []

        for track in all_tracks:
            tid = track.get("id")
            if not tid or track.get("popularity", 0) > 90:
                continue

            f     = features_map.get(tid, DEFAULT_FEATURES[energy])
            entry = {
                "song_name":   track["name"],
                "artist":      track["artists"][0]["name"],
                "album":       track["album"]["name"],
                "spotify_url": track["external_urls"]["spotify"],
                "spotify_id":  tid,
                "preview_url": track.get("preview_url"),
                "image_url":   track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                "popularity":  track.get("popularity", 50),
                "bpm":         f["tempo"],
                "energy":      f["energy"],
                "valence":     f["valence"],
            }

            score, reasons   = score_track(entry, mood, energy, bpm_min, bpm_max)
            entry["score"]   = score
            entry["reasons"] = reasons
            raw_playlist.append(entry)

        if not raw_playlist:
            return jsonify({"playlist": [], "mood": mood, "context": context, "energy": energy})

        ranked = sorted(raw_playlist, key=lambda x: x["score"], reverse=True)

        final        = []
        artists_seen = set()
        for track in ranked:
            if not artist and track["artist"] in artists_seen:
                continue
            final.append(track)
            artists_seen.add(track["artist"])
            if len(final) >= 20:
                break

        if len(final) < 10:
            final = ranked[:20]

        playlist_id = str(uuid.uuid4())[:8]
        save_playlist(playlist_id, {
            "query": user_text, "mood": mood,
            "context": context, "energy": energy, "playlist": final,
        })

        return jsonify({
            "mood": mood, "context": context, "energy": energy,
            "playlist": final, "playlist_id": playlist_id,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/playlist/<playlist_id>", methods=["GET"])
def get_playlist(playlist_id):
    db   = load_playlists()
    data = db.get(playlist_id)
    if not data:
        return jsonify({"error": "Playlist not found"}), 404
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)