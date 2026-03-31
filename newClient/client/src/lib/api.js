// API utility for movie discovery backend
const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api/movies";
const FAV_BASE =
  import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace("/api/movies", "/api/favorites")
    : "http://localhost:3000/api/favorites";

// ─── Favorites API ───
export const favoritesApi = {
  getAll: async () => {
    const res = await fetch(FAV_BASE);
    if (!res.ok) throw new Error("Failed to fetch favorites");
    return res.json();
  },

  add: async (movie) => {
    const res = await fetch(`${FAV_BASE}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: movie._id || movie.id,
        title: movie.title,
        poster: movie.poster || movie.poster_url,
        year: movie.year,
        genres: movie.genres,
        runtime: movie.runtime,
        cast: (movie.cast || []).slice(0, 5),
        plot: movie.plot,
        imdb: movie.imdb,
      }),
    });
    if (!res.ok) throw new Error("Failed to add favorite");
    return res.json();
  },

  remove: async (movieId) => {
    const res = await fetch(`${FAV_BASE}/remove/${movieId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove favorite");
    return res.json();
  },
};

export const api = {
  // Trending movies
  getTrending: async () => {
    try {
      const response = await fetch(`${API_BASE}/trending`);
      if (!response.ok) throw new Error("Failed to fetch trending movies");
      return await response.json();
    } catch (error) {
      console.error("Error fetching trending:", error);
      return [];
    }
  },

  // Search by title
  searchByTitle: async query => {
    try {
      const response = await fetch(
        `${API_BASE}/search/title?q=${encodeURIComponent(query)}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to search by title");
      return await response.json();
    } catch (error) {
      console.error("Error searching by title:", error);
      return [];
    }
  },

  // Search by plot (text)
  searchByPlotText: async query => {
    try {
      const response = await fetch(
        `${API_BASE}/search/plot/text?q=${encodeURIComponent(query)}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to search by plot text");
      return await response.json();
    } catch (error) {
      console.error("Error searching by plot text:", error);
      return [];
    }
  },

  // Search by plot (semantic)
  searchByPlotSemantic: async query => {
    try {
      const response = await fetch(
        `${API_BASE}/search/plot/semantic?q=${encodeURIComponent(query)}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to search by plot semantic");
      return await response.json();
    } catch (error) {
      console.error("Error searching by plot semantic:", error);
      return [];
    }
  },

  // Fallback search
  search: async query => {
    try {
      const response = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to search");
      return await response.json();
    } catch (error) {
      console.error("Error searching:", error);
      return [];
    }
  },

  // Get movie details by ID
  getMovieById: async id => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) throw new Error("Failed to fetch movie details");
      return await response.json();
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  },

  // Chatbot: search by mood-mapped query (limited to 5 results) — LEGACY
  searchByMood: async query => {
    try {
      const response = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=5`
      );
      if (!response.ok) throw new Error("Failed to fetch mood suggestions");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error("Error fetching mood suggestions:", error);
      return [];
    }
  },

  // Chatbot: POST user message → backend intent detection + genre query → { reply, movies }
  chatByMessage: async (message) => {
    try {
      const CHAT_URL = import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL.replace("/api/movies", "/api/chat")
        : "http://localhost:3000/api/chat";

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();
      console.log("🤖 Chat response:", data);
      return data; // { reply: string, movies: Array }
    } catch (error) {
      console.error("Error in chatByMessage:", error);
      return { reply: "Something went wrong. Try again!", movies: [] };
    }
  },

  // Intent-based smart search (with conversational context support)
  searchByIntent: async (query, sessionId = null) => {
    try {
      let url = `${API_BASE}/search/intent?q=${encodeURIComponent(query)}&limit=20`;
      if (sessionId) {
        url += `&sessionId=${encodeURIComponent(sessionId)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to perform intent search");
      const data = await response.json();
      // Returns { sessionId, isFollowUp, contextSummary, intent, results, total }
      return data;
    } catch (error) {
      console.error("Error performing intent search:", error);
      return { sessionId: null, isFollowUp: false, contextSummary: null, intent: null, results: [], total: 0 };
    }
  },

  // Cast-based search
  searchByCast: async (name, filters = {}) => {
    try {
      let url = `${API_BASE}/cast/search?name=${encodeURIComponent(name)}`;
      if (filters.genre) url += `&genre=${encodeURIComponent(filters.genre)}`;
      if (filters.yearMin) url += `&yearMin=${filters.yearMin}`;
      if (filters.yearMax) url += `&yearMax=${filters.yearMax}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to search by cast");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error searching by cast:", error);
      return { actor: name, results: [], total: 0 };
    }
  },

  // Suggest actors (autocomplete)
  suggestActors: async (query) => {
    try {
      const response = await fetch(
        `${API_BASE}/cast/suggest?q=${encodeURIComponent(query)}&limit=5`
      );
      if (!response.ok) throw new Error("Failed to suggest actors");
      return await response.json();
    } catch (error) {
      console.error("Error suggesting actors:", error);
      return [];
    }
  },

  // Get top/trending cast members
  getTopCast: async (limit = 20) => {
    try {
      const response = await fetch(`${API_BASE}/cast/top?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to get top cast");
      return await response.json();
    } catch (error) {
      console.error("Error getting top cast:", error);
      return [];
    }
  },

  // Autocomplete (real-time suggestions: movies, actors, directors)
  autocomplete: async (query) => {
    try {
      const response = await fetch(
        `${API_BASE}/autocomplete?q=${encodeURIComponent(query)}&limit=5`
      );
      if (!response.ok) throw new Error("Autocomplete failed");
      return await response.json();
    } catch (error) {
      console.error("Error in autocomplete:", error);
      return { movies: [], actors: [], directors: [] };
    }
  },
};
