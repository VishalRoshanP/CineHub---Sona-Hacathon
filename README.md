<p align="center">
  <img src="https://img.shields.io/badge/CineHub-AI%20Powered-blueviolet?style=for-the-badge&logo=themoviedatabase&logoColor=white" alt="CineHub Badge"/>
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge" alt="Status Badge"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License Badge"/>
</p>

## 📸 Demo & Screenshots

<a href="https://ibb.co/7t0PQGnx"><img src="https://i.ibb.co/tp1gzbqw/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>

<a href="https://ibb.co/dsP1w2Hg"><img src="https://i.ibb.co/dsP1w2Hg/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>

<a href="https://ibb.co/Ngy7WgWB"><img src="https://i.ibb.co/Ngy7WgWB/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>

<a href="https://ibb.co/S71RqXyN"><img src="https://i.ibb.co/S71RqXyN/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>

<a href="https://ibb.co/xqFmR3mt"><img src="https://i.ibb.co/xqFmR3mt/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>
<a href="https://ibb.co/wF8RymTw"><img src="https://i.ibb.co/sdc2jYh6/Whats-App-Image-2026-03-31-at-7-04-45-PM.jpg" alt="Whats-App-Image-2026-03-31-at-7-04-45-PM" border="0"></a>

<a href="https://ibb.co/bgmhbGy3"><img src="https://i.ibb.co/bgmhbGy3/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>

<a href="https://ibb.co/dsVWRNTg"><img src="https://i.ibb.co/dsVWRNTg/Whats-App-Image-2026-03-31-at-7-06-09-PM-png.jpg" alt="Whats-App-Image-2026-03-31-at-7-06-09-PM-png" border="0" /></a>


<h1 align="center">🎬 CineHub</h1>



<p align="center">
  <strong>AI-Powered Movie Discovery — Search Smarter, Not Harder.</strong>
</p>

<p align="center">
  CineHub is an intelligent movie discovery platform that combines <b>fuzzy search</b>, <b>natural language processing</b>, and <b>vector embeddings</b> to deliver Netflix-grade search experiences. Ask it anything — <em>"sad sci-fi movies from the 90s"</em> or <em>"movies like Inception"</em> — and watch AI do the rest.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-deployment">Deployment</a>
</p>

---



> 


---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Smart Search** | Multi-pipeline search: fuzzy matching, intent detection, and NLP-powered queries |
| 🧠 **Vector Embedding Search** | Semantic similarity via HuggingFace `all-MiniLM-L6-v2` or Voyage AI embeddings |
| 🤖 **AI Chatbot** | Conversational movie assistant with context-aware recommendations |
| ⚡ **Autocomplete** | Real-time prefix search with debounced suggestions as you type |
| 🎭 **Cast-Based Discovery** | Click any actor → instantly discover their filmography |
| ⭐ **Favorites System** | Add/remove/toggle favorites with optimistic UI updates |
| 🎙️ **Voice Search** | Browser-native speech recognition for hands-free queries |
| 🎨 **3D Animated UI** | Three.js particle background with Framer Motion page transitions |
| 📱 **Fully Responsive** | Mobile-first design with adaptive layouts |
| 🛡️ **Production Error Handling** | Centralized error middleware with structured Winston logging |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI component library |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion** | Page transitions & micro-animations |
| **Three.js / R3F** | 3D animated background scene |
| **TanStack Query** | Server state management & caching |
| **Radix UI** | Accessible headless component primitives |
| **Wouter** | Lightweight client-side routing |
| **Recharts** | Data visualization |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express 5** | REST API framework |
| **MongoDB Atlas** | Cloud database (Mflix sample dataset) |
| **Mongoose 9** | ODM for MongoDB |
| **Winston** | Structured request/response logging |
| **HuggingFace Transformers** | Local vector embedding generation |
| **Voyage AI** | Cloud-based embedding alternative |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ SearchBar│  │ MovieCards  │  │ Chatbot  │  │  Favorites   │  │
│  │ + Voice  │  │ + Details  │  │ (useChatbot)│ │  Context     │  │
│  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │              │               │           │
│       └──────────────┴──────┬───────┴───────────────┘           │
│                             │  Axios + TanStack Query            │
└─────────────────────────────┼────────────────────────────────────┘
                              │  REST API (http://localhost:3000)
┌─────────────────────────────┼────────────────────────────────────┐
│                      SERVER (Express 5)                          │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                    Request Logger                          │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────┐  ┌────────────▼──┐  ┌──────────┐  ┌───────────┐  │
│  │ Movie    │  │ Intent Search │  │ Chat     │  │ Favorite  │  │
│  │ Controller│ │ Controller    │  │ Handler  │  │ Controller│  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  │
│       │               │               │              │         │
│  ┌────▼─────┐  ┌──────▼───────┐  ┌────▼──────────┐  │         │
│  │ Movie    │  │ Intent       │  │  Conversation │  │         │
│  │ Service  │  │ Parser       │  │  Context Mgr  │  │         │
│  └────┬─────┘  └──────┬───────┘  └───────────────┘  │         │
│       │               │                              │         │
│  ┌────▼─────┐  ┌──────▼───────┐                      │         │
│  │ Fuzzy    │  │ Embedding    │                      │         │
│  │ Service  │  │ (HF/Voyage)  │                      │         │
│  └────┬─────┘  └──────┬───────┘                      │         │
│       └───────────────┴──────────────────────────────┘         │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                   Error Handler                            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    MongoDB Atlas (sample_mflix)                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ movies   │  │ favorites    │  │ Atlas Search Indexes      │   │
│  │          │  │              │  │  • text index             │   │
│  │          │  │              │  │  • vector index (384d)    │   │
│  └──────────┘  └──────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** or **pnpm**
- **MongoDB Atlas** account ([free tier works](https://www.mongodb.com/atlas))
- **Mflix sample dataset** loaded in your cluster

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/CineHub.git
cd CineHub
```

### 2️⃣ Backend Setup

```bash
# Install backend dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env with your credentials (see section below)
```

### 3️⃣ Frontend Setup

```bash
# Navigate to the client directory
cd newClient

# Install frontend dependencies (pnpm recommended)
pnpm install
# or
npm install
```

### 4️⃣ Start Development

```bash
# From the project root — starts both backend and frontend concurrently
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:3000` |
| Health Check | `http://localhost:3000/api/health` |

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# ── Server
PORT=3000

# ── MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
DB_NAME=sample_mflix

# ── Embedding Configuration
# Options: "huggingface" | "voyage" | "local"
#   huggingface  → Local Xenova/all-MiniLM-L6-v2 (384 dims, free, no API key needed)
#   voyage       → Voyage AI cloud embeddings (voyage-3-large, requires API key)
#   local        → Text-only search fallback, no embeddings
EMBEDDING_MODE=huggingface

# ── Voyage AI (only needed if EMBEDDING_MODE=voyage)
VOYAGE_API_KEY=your_voyage_api_key_here

# ── HuggingFace (optional, local model usually works without token)
HF_TOKEN=your_hf_token_here
```

> **💡 Tip:** The `huggingface` mode runs entirely locally — no external API calls, no rate limits, zero cost.

---git branch -M main

## 📡 API Reference

### Movie Endpoints — `/api/movies`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies/search?q=<query>` | Unified smart search (fuzzy + text) |
| `GET` | `/api/movies/search/intent?q=<query>` | Intent-based NLP search |
| `GET` | `/api/movies/search/title?q=<query>` | Title-only text search |
| `GET` | `/api/movies/search/plot/text?q=<query>` | Full-text plot search |
| `GET` | `/api/movies/search/plot/semantic?q=<query>` | Vector similarity plot search |
| `GET` | `/api/movies/autocomplete?q=<prefix>` | Real-time autocomplete suggestions |
| `GET` | `/api/movies/trending` | Trending movies |
| `GET` | `/api/movies/:id` | Movie details by ID |

### Cast Endpoints — `/api/movies`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies/cast/search?name=<actor>` | Movies by cast member |
| `GET` | `/api/movies/cast/suggest?q=<prefix>` | Cast autocomplete |
| `GET` | `/api/movies/cast/top` | Top trending cast members |

### Favorites Endpoints — `/api/favorites`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/favorites` | Get all favorites |
| `POST` | `/api/favorites/add` | Add movie to favorites |
| `POST` | `/api/favorites/toggle` | Toggle favorite status |
| `GET` | `/api/favorites/check/:movieId` | Check if movie is favorited |
| `DELETE` | `/api/favorites/remove/:movieId` | Remove from favorites |

### Chatbot — `/api/chat`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message to AI movie assistant |

**Request body:**
```json
{
  "message": "Recommend me a thriller like Se7en",
  "sessionId": "unique-session-id"
}
```

### API Flow

```
User types query → SearchBar (debounce 300ms)
     │
     ├─→ /autocomplete (instant prefix matches)
     │
     └─→ /search/intent (full pipeline)
              │
              ├─ 1. Intent Parser: detect genre, year, mood, cast
              ├─ 2. Fuzzy Service: phonetic + Levenshtein matching
              ├─ 3. Embedding Service: vector similarity (384-dim)
              └─ 4. Score & Rank → return top results with intent metadata
```

---

## 📁 Project Structure

```
CineHub/
├── server.js                      # Express server entry point
├── package.json                   # Backend dependencies & scripts
├── .env                           # Environment variables
│
├── controller/
│   ├── movie.controller.js        # Search, trending, details, autocomplete
│   ├── intent-search.controller.js # NLP intent-based search pipeline
│   ├── chat.controller.js         # AI chatbot request handler
│   ├── cast.controller.js         # Cast search & suggestions
│   └── favorite.controller.js     # Add/remove/toggle favorites
│
├── services/
│   ├── movie.service.js           # Core movie query logic & aggregations
│   ├── fuzzy.service.js           # Fuzzy matching (Levenshtein + phonetic)
│   ├── intent-parser.js           # NLP intent detection & entity extraction
│   ├── cast.service.js            # Cast-related DB queries
│   ├── conversation-context.js    # Chatbot session memory manager
│   ├── hf.service.js              # HuggingFace local embedding service
│   └── voyage.service.js          # Voyage AI cloud embedding service
│
├── models/
│   ├── movie.model.js             # Mongoose movie schema (Mflix)
│   └── favorite.model.js          # Mongoose favorites schema
│
├── routes/
│   ├── movie.routes.js            # Movie & cast API routes
│   └── favorite.routes.js         # Favorites CRUD routes
│
├── error-handling/
│   └── errorHandler.js            # Centralized Express error middleware
│
├── utils/
│   ├── db.js                      # MongoDB connection manager
│   └── logger.js                  # Winston structured logger
│
├── scripts/
│   ├── migrate-embeddings.js      # Voyage AI embedding migration script
│   └── migrate-embeddings-hf.js   # HuggingFace embedding migration script
│
└── newClient/                     # Frontend application
    ├── package.json               # Frontend dependencies (React, Vite)
    ├── vite.config.ts             # Vite build configuration
    ├── tsconfig.json              # TypeScript configuration
    │
    └── client/
        ├── index.html             # SPA entry point
        └── src/
            ├── App.tsx            # Root component & routing
            ├── main.tsx           # React DOM mount
            ├── index.css          # Global styles & Tailwind directives
            │
            ├── pages/
            │   ├── Home.jsx       # Landing page with search & trending
            │   ├── MovieDetails.jsx  # Full movie detail view
            │   └── FavoritesPage.jsx # User's favorites list
            │
            ├── components/
            │   ├── SearchBar.jsx       # Smart search with autocomplete & voice
            │   ├── MovieCard.jsx       # Movie poster card component
            │   ├── MovieDetailModal.jsx # Detailed movie modal overlay
            │   ├── Navbar.jsx          # Navigation header
            │   ├── FilterPanel.jsx     # Genre/year/rating filters
            │   ├── TrendingCast.jsx    # Trending actors carousel
            │   ├── RecommendationSection.jsx # "You might also like"
            │   ├── ThreeBackground.jsx # 3D particle scene wrapper
            │   ├── Scene.jsx           # Three.js scene definition
            │   ├── VoiceSearchOverlay.jsx # Voice input UI
            │   ├── WatchHistory.jsx    # Recently viewed tracker
            │   ├── chatbot/            # AI chatbot components
            │   └── ui/                 # Radix-based UI primitives
            │
            ├── contexts/
            │   ├── FavoritesContext.jsx   # Favorites state management
            │   ├── CastSearchContext.jsx  # Cast-based search state
            │   ├── MovieModalContext.jsx  # Movie detail modal state
            │   └── ThemeContext.tsx       # Dark/light theme toggle
            │
            └── hooks/
                ├── useChatbot.js       # Chatbot API integration
                ├── useVoiceSearch.js    # Speech recognition hook
                ├── useMovieQueries.js   # TanStack Query movie hooks
                ├── useFetch.js         # Generic fetch wrapper
                └── useWatchHistory.js   # Local watch history tracker
```

---

## 🔍 How Search Works

CineHub employs a **multi-pipeline search architecture** that routes queries through three distinct engines, then fuses and ranks the results.

### Pipeline 1 — Fuzzy Search
```
Input: "incpetion" (typo)
  │
  ├─ Levenshtein Distance → matches "Inception" (edit distance: 2)
  ├─ Phonetic Encoding → "INSP" matches "INSPSHN"
  └─ Trigram Overlap → "inc","nce","cep" → high similarity score
  
Result: Inception (1.0 confidence)
```

### Pipeline 2 — Intent-Based NLP Search
```
Input: "sad sci-fi movies from the 90s"
  │
  ├─ Genre Extraction    → ["Science Fiction"]
  ├─ Mood Detection      → "sad" → filter by drama overlap
  ├─ Year Parsing        → { $gte: 1990, $lte: 1999 }
  └─ Entity Recognition  → no specific cast/director detected
  
Result: MongoDB aggregation with compound filters
```

### Pipeline 3 — Vector Embedding Search
```
Input: "movies about a heist gone wrong"
  │
  ├─ Text → 384-dim vector (HuggingFace all-MiniLM-L6-v2)
  ├─ MongoDB Atlas Vector Search ($vectorSearch)
  └─ Cosine similarity ranking across plot embeddings
  
Result: Top-K semantically similar movies
```

### Result Fusion
```
All three pipelines → Weighted score merge
  │
  ├─ Fuzzy:    30% weight (exact + typo correction)
  ├─ Intent:   40% weight (structured understanding)
  └─ Semantic: 30% weight (meaning-based similarity)
  
→ Deduplicated, sorted by composite score → Top results returned
```

---

## 🤖 Chatbot Architecture

The AI Chatbot (`/api/chat`) provides a conversational movie discovery experience with session-based context memory.

```
User: "I liked The Dark Knight. What else should I watch?"
  │
  ▼
┌──────────────────────────────────────────────────┐
│  Chat Controller                                  │
│  1. Extract session ID                            │
│  2. Load conversation context (last 10 messages)  │
│  3. Parse user intent from message                │
│  4. Query movie database with extracted criteria   │
│  5. Generate natural response with movie cards     │
│  6. Save turn to session context                   │
└──────────────────────────────────────────────────┘
  │
  ▼
Bot: "Since you enjoyed The Dark Knight, you might love these thrillers:
      • Inception (2010) — Mind-bending heist thriller by Nolan
      • Se7en (1995) — Dark crime thriller with Brad Pitt
      • Memento (2000) — Nolan's reverse-chronology mystery"
```

**Key Features:**
- **Session Memory:** Maintains conversation context using `conversation-context.js` with configurable history depth
- **Intent-Aware:** Parses "recommend", "similar to", "by director" patterns
- **Contextual Follow-ups:** "What about comedies?" remembers previous filters
- **Structured Responses:** Returns both text responses and structured movie data for rich card rendering

---

## ☁️ Deployment Guide

### Frontend → Vercel

```bash
# From the newClient directory
cd newClient

# Build the production bundle
pnpm run build

# Deploy to Vercel
npx vercel --prod
```

**Vercel Configuration:**
| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `pnpm run build` |
| Output Directory | `dist` |
| Root Directory | `newClient` |
| Environment Variable | `VITE_API_URL` = your backend URL |

### Backend → Render / Railway

#### Option A: Render (Free Tier)

1. Connect your GitHub repo to [Render](https://render.com)
2. Create a **Web Service** with these settings:

| Setting | Value |
|---------|-------|
| Build Command | `npm install` |
| Start Command | `npm run server` |
| Environment | Node |

3. Add all `.env` variables in the Render dashboard

#### Option B: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & deploy
railway login
railway init
railway up
```

### MongoDB Atlas Checklist

- [ ] Cluster created on [MongoDB Atlas](https://cloud.mongodb.com)
- [ ] `sample_mflix` dataset loaded via Atlas UI
- [ ] Network access: allow `0.0.0.0/0` for cloud deployment
- [ ] Database user created with read/write permissions
- [ ] Atlas Search index created for text search
- [ ] Atlas Vector Search index created (384 dimensions, cosine similarity)

---

## ⚠️ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MongoServerError: bad auth` | Wrong credentials in `MONGO_URI` | Verify username/password in Atlas → Database Access |
| `ECONNREFUSED localhost:3000` | Backend not running | Run `npm run server` from project root |
| `CORS policy: blocked` | Frontend URL not whitelisted | Update `origin` in `server.js` CORS config to match your frontend URL |
| `Cannot find module './utils/db.js'` | Running from wrong directory | Ensure you run `npm run server` from the project root, not `/newClient` |
| `Embedding model download hangs` | First-time HuggingFace model download | Wait 30-60s on first run; the model (~80MB) is cached after download |
| `$vectorSearch: unknown stage` | Atlas Search index not configured | Create a vector search index on the `movies` collection in Atlas UI |
| `Port 5173 already in use` | Previous Vite instance running | Kill the process: `npx kill-port 5173` or use `--port 5174` |
| `pnpm: command not found` | pnpm not installed globally | Run `npm install -g pnpm` or use `npm install` instead |

---

## 🔮 Future Enhancements

- [ ] 🔐 **User Authentication** — JWT-based auth with Google OAuth
- [ ] 📊 **Personalized Recommendations** — Collaborative filtering based on watch history
- [ ] 🎬 **Trailer Integration** — Embedded YouTube trailers in movie details
- [ ] 🌍 **Multi-Language Support** — i18n for UI + multilingual search
- [ ] 📱 **PWA Support** — Installable mobile app with offline favorites
- [ ] 🧪 **A/B Testing** — Experiment with search ranking algorithms
- [ ] 📈 **Analytics Dashboard** — Search trends, popular movies, user engagement metrics
- [ ] 🎯 **Advanced Filters** — Runtime, certification, streaming platform availability
- [ ] 🤝 **Social Features** — Share lists, collaborative watchlists, reviews

---

## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/your-username">
        <img src="https://github.com/identicons/your-username.png" width="80" style="border-radius:50%;" alt="Your Name"/>
        <br />
        <sub><b>Your Name</b></sub>
      </a>
      <br />
      <sub>Full Stack Developer</sub>
    </td>
    <!-- Add more contributors here -->
  </tr>
</table>

> 💬 **Want to contribute?** Fork the repo, create a feature branch, and submit a PR. All contributions are welcome!

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 CineHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<p align="center">
  <b>Built with ❤️ for movie lovers, powered by AI.</b>
  <br />
  <sub>If you found this useful, consider giving it a ⭐ on GitHub!</sub>
</p>
