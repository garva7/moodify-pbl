# 🎧 Moodify — AI Mood-Based Music Recommender

Turn your emotions into a playlist.

Moodify is a full-stack AI-powered web app that converts natural language mood input into curated Spotify playlists with explainable recommendations.

---

## ✨ Features

* 🧠 **LLM-powered mood understanding**
  Uses Groq (LLaMA 3) to extract:

  * Mood
  * Energy
  * Context
  * Artist intent

* 🔍 **Smart query generation**
  Dynamically generates Spotify search queries based on user intent (not static templates)

* 🎯 **Custom recommendation engine**
  Scores tracks based on:

  * BPM proximity
  * Energy match
  * Valence (mood alignment)
  * Popularity (boosts hidden gems)

* 💡 **Explainable AI**
  Each song includes reasons like:

  * 🔥 BPM match
  * 💎 Hidden gem
  * 🌧️ Sad vibe

* ⚡ **Optimized backend**

  * Token Bucket rate limiting (5 req/sec, burst 10)
  * Audio feature caching (JSON-based)
  * Safe fallback for Spotify failures

* 🎨 **Modern UI**

  * Animated background (Framer Motion)
  * Spotify embedded player
  * Smooth scrolling playlists
  * Interactive song cards

* 🔗 **Shareable playlists**

  * Unique playlist ID
  * Share via link

---

## 🧠 How It Works

1. User enters a mood (e.g. *"late night drive, sad but peaceful"*)
2. LLM parses intent → structured data
3. Queries are generated dynamically
4. Spotify API fetches tracks
5. Audio features are extracted
6. Tracks are scored + ranked
7. Playlist is returned with reasoning

---

## 🏗️ Tech Stack

### Frontend

* React.js
* Framer Motion
* Modern CSS (glassmorphism UI)
* Spotify Embed API

### Backend

* Flask
* Spotipy (Spotify API)
* Groq (LLaMA 3)
* Token Bucket Algorithm
* JSON-based caching

---

## 📦 Project Structure

```
moodify/
│
├── backend/
│   ├── app.py
│   ├── audio_features_cache.json
│   └── playlists_db.json
│
├── frontend/
│   ├── App.jsx
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 🔹 1. Clone Repo

```bash
git clone https://github.com/yourusername/moodify-pbl.git
cd moodify
```

---

### 🔹 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` file:

```env
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
GROQ_API_KEY=your_key
```

Run backend:

```bash
python app.py
```

---

### 🔹 3. Frontend Setup

```bash
cd moodify-frontend

Run frontend:

```bash
npm run dev
```

---

## 🌐 Deployment

### Backend (Railway)

* Add environment variables
* Start command:

```bash
gunicorn app:app --timeout 120
```

---

### Frontend (Vercel)

Add environment variable:

```env
VITE_API_URL=https://your-backend-url
```

---

## 🚨 Known Issues

* Spotify API may return **403 errors** under heavy load
* External API failures are handled with fallback defaults
* Large requests may slightly increase response time

---

## 🔮 Future Improvements

* Async parallel fetching (faster responses)
* User authentication + saved playlists
* ML-based recommendation refinement
* Real-time Spotify playback sync

---

## 💼 Resume Description

Built an AI-powered music recommendation system using LLaMA 3 and Spotify API, featuring dynamic query generation, token-bucket rate limiting, audio feature caching, and explainable recommendations, with a modern React frontend and shareable playlists.

---

## 🙌 Acknowledgements

* Spotify API
* Groq (LLaMA models)
* Framer Motion

---

## ⚡ Author

**Garv Arora**
