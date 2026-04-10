import random as rnd
import time
import logging
import json
import os
import re
import uuid
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
from groq import Groq

# ── Silence Spotipy 403 spam ──────────────────────────────────────────────────
logging.getLogger("spotipy").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

load_dotenv()

app    = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
), requests_timeout=5
)

# ── Constants ─────────────────────────────────────────────────────────────────
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


# =============================================================================
#  1. TOKEN BUCKET  — proper rate-limit handling (replaces time.sleep)
# =============================================================================
class TokenBucket:
    """
    Allows `rate` tokens/second, burst up to `capacity`.
    Thread-safe. Callers block only when the bucket is empty.
    """
    def __init__(self, capacity: float, rate: float):
        self.capacity   = capacity
        self.rate       = rate
        self.tokens     = capacity
        self.last_time  = time.monotonic()
        self._lock      = threading.Lock()

    def acquire(self, tokens: float = 1.0):
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


# 5 Spotify requests/sec, burst up to 10
spotify_bucket = TokenBucket(capacity=10, rate=5)


# =============================================================================
#  2. AUDIO FEATURE CACHE  — JSON file, avoids repeated Spotify API hits
# =============================================================================
def load_cache() -> dict:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache: dict):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass

_feature_cache = load_cache()   # loaded once at startup


# =============================================================================
#  3. PLAYLIST DB  — for shareable links
# =============================================================================
def load_playlists() -> dict:
    if os.path.exists(PLAYLIST_DB):
        try:
            with open(PLAYLIST_DB, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_playlist(playlist_id: str, data: dict):
    db = load_playlists()
    db[playlist_id] = data
    try:
        with open(PLAYLIST_DB, "w") as f:
            json.dump(db, f)
    except Exception:
        pass


# =============================================================================
#  Helpers
# =============================================================================
def parse_json_safe(text: str) -> dict:
    text = re.sub(r"```(?:json)?\s*", "", text).strip().replace("```", "").strip()
    return json.loads(text)


def is_artist_track(track: dict, artist_name: str) -> bool:
    """Exact match — prevents 'Drake Williams' matching 'Drake'."""
    target   = artist_name.lower().strip()
    credited = [a["name"].lower().strip() for a in track.get("artists", [])]
    for name in credited:
        if name == target:
            return True
        if target in name.split() or name in target.split():
            return True
    return False


# =============================================================================
#  4. LLM INTENT PARSING
# =============================================================================
def parse_request(user_text: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Return only JSON."},
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
            temperature=0
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


# =============================================================================
#  5. CONTEXT-AWARE QUERY EXPANSION via LLM  (replaces hardcoded templates)
# =============================================================================
def expand_queries(parsed: dict) -> list:
    artist  = parsed.get("artist")
    mood    = parsed.get("mood", "general")
    context = parsed.get("context", "general")
    energy  = parsed.get("energy", "medium")
    genre   = parsed.get("genre_hint", "pop")

    try:
        if artist:
            prompt = f"""
You are a music curator. Generate 9 diverse Spotify search queries to find songs by or heavily featuring "{artist}".
Include: studio albums, deep cuts, collaborations, features, live versions, and lesser-known tracks.
Return ONLY a JSON array of 9 query strings. No explanation.
Example: ["artist query 1", "artist query 2", ...]
"""
        else:
            prompt = f"""
You are a music curator. Generate 9 diverse Spotify search queries to find non-mainstream, emotionally resonant tracks for:
- Mood: {mood}
- Context: {context}
- Energy level: {energy}
- Genre hint: {genre}

Rules:
- Explore adjacent subgenres, not just the obvious one
- Mix underground artists with moderately known ones
- Include different eras (90s/2000s/2010s/recent)
- Vary the query format (artist names, mood phrases, genre combos)
- Do NOT just repeat "{mood} {genre}" in every query

Return ONLY a JSON array of 9 query strings. No explanation.
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Return only a JSON array of strings, nothing else."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.8
        )
        raw     = response.choices[0].message.content
        raw     = re.sub(r"```(?:json)?\s*", "", raw).strip().replace("```", "").strip()
        queries = json.loads(raw)
        if isinstance(queries, list) and len(queries) >= 3:
            if artist:
                queries = [f"artist:{artist}"] + queries
            return queries[:10]
    except Exception:
        pass

    # Fallback hardcoded
    if artist:
        return [f"artist:{artist}", f"{artist}", f"{artist} {mood}",
                f"{artist} {context}", f"{artist} deep cuts", f"{artist} b-sides"]
    return [
        f"{mood} {genre} {context}", f"{context} {genre} mix",
        f"{mood} vibe {genre}", f"{genre} {energy} energy",
        f"{context} playlist {genre}", f"{mood} underground {genre}",
        f"indie {genre} {mood}", f"{mood} {genre} 2023", f"{genre} hidden gems",
    ]


# =============================================================================
#  6. AUDIO FEATURE FETCHING  — cache + token bucket + retry
# =============================================================================
def fetch_audio_features_safe(track_ids: list, energy_level: str) -> dict:
    global _feature_cache
    defaults     = DEFAULT_FEATURES[energy_level]
    features_map = {}

    # Return cached entries immediately
    uncached = []
    for tid in track_ids:
        if tid in _feature_cache:
            features_map[tid] = _feature_cache[tid]
        else:
            uncached.append(tid)

    # Fetch uncached in batches of 3, no retries
    for i in range(0, len(uncached), 3):
        batch = uncached[i:i + 3]

        try:
            spotify_bucket.acquire()
            fetched = sp.audio_features(batch)
        except Exception:
            fetched = None  # silent fallback, no retry, no print

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


# =============================================================================
#  7. SCORING ENGINE  — returns (score, reasons) for explainability
# =============================================================================
def score_track(track: dict, mood: str, energy: str,
                bpm_min: float, bpm_max: float):
    score   = 0
    reasons = []

    # BPM
    bpm       = track.get("bpm", 0)
    target    = (bpm_min + bpm_max) / 2
    bpm_score = max(0, 50 - abs(bpm - target))
    score    += bpm_score
    if bpm_score >= 40:
        reasons.append(f"🔥 BPM match ({int(bpm)})")
    elif bpm > 0:
        reasons.append(f"🎵 BPM: {int(bpm)}")

    # Energy
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

    # Valence / mood
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

    # Popularity sweet spot
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


# =============================================================================
#  ROUTES
# =============================================================================
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

        # 5. LLM query expansion
        queries = expand_queries(parsed)
        rnd.shuffle(queries)
        queries = queries[:6]

        all_tracks = []
        seen_ids   = set()

        for query in queries:
            for offset in [0, 10]:
                try:
                    spotify_bucket.acquire()
                    results = sp.search(
                        q=query, type="track",
                        limit=10, offset=offset, market="IN"
                    )
                except Exception:
                    continue
                for t in results["tracks"]["items"]:
                    if t["id"] in seen_ids:
                        continue
                    if artist and not is_artist_track(t, artist):
                        continue
                    seen_ids.add(t["id"])
                    all_tracks.append(t)

        if not all_tracks:
            return jsonify({"playlist": []})

        # 6. Audio features (cache-backed)
        track_ids    = [t["id"] for t in all_tracks if t.get("id")]
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

            # 7. Scoring + explainability reasons
            score, reasons   = score_track(entry, mood, energy, bpm_min, bpm_max)
            entry["score"]   = score
            entry["reasons"] = reasons

            raw_playlist.append(entry)

        if not raw_playlist:
            return jsonify({"playlist": []})

        ranked = sorted(raw_playlist, key=lambda x: x["score"], reverse=True)

        final        = []
        artists_seen = set()
        for t in ranked:
            if not artist and t["artist"] in artists_seen:
                continue
            final.append(t)
            artists_seen.add(t["artist"])
            if len(final) >= 20:
                break

        if len(final) < 10:
            final = ranked[:20]

        # 8. Save and return shareable ID
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
    """Retrieve a saved playlist by its share ID."""
    db   = load_playlists()
    data = db.get(playlist_id)
    if not data:
        return jsonify({"error": "Playlist not found"}), 404
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)