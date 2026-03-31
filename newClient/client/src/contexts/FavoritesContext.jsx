/**
 * Favorites Context — MongoDB API-backed favorites with optimistic UI
 *
 * Features:
 *   - Loads favorites from backend on mount
 *   - Optimistic add/remove with API sync
 *   - Toast notifications via sonner
 *   - Rollback on API failure
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { favoritesApi } from "@/lib/api";

const FavoritesContext = createContext({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
  favCount: 0,
  loading: true,
});

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  // Load favorites from backend on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    favoritesApi.getAll()
      .then((data) => {
        if (Array.isArray(data)) {
          setFavorites(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load favorites:", err);
        // Fallback: try localStorage
        try {
          const local = JSON.parse(localStorage.getItem("cinehub_favorites") || "[]");
          if (Array.isArray(local) && local.length > 0) setFavorites(local);
        } catch {}
      })
      .finally(() => setLoading(false));
  }, []);

  const addFavorite = useCallback((movie) => {
    if (!movie) return;
    const id = movie._id || movie.id;
    const movieId = String(id);

    // Optimistic: add immediately
    const entry = {
      _id: id,
      movieId,
      title: movie.title,
      year: movie.year,
      poster: movie.poster || movie.poster_url,
      genres: movie.genres,
      runtime: movie.runtime,
      imdb: movie.imdb,
      cast: (movie.cast || []).slice(0, 5),
      plot: movie.plot,
      addedAt: new Date().toISOString(),
    };

    setFavorites(prev => {
      if (prev.some(m => String(m._id || m.movieId) === movieId)) return prev;
      return [entry, ...prev];
    });

    toast.success("Added to Favorites ❤️", {
      description: movie.title,
      duration: 2000,
    });

    // Sync to backend
    favoritesApi.add(movie).catch((err) => {
      console.error("Failed to add favorite:", err);
      // Rollback
      setFavorites(prev => prev.filter(m => String(m._id || m.movieId) !== movieId));
      toast.error("Failed to add favorite", { description: "Please try again" });
    });
  }, []);

  const removeFavorite = useCallback((movieId) => {
    const id = String(movieId);

    // Save for rollback
    const removed = favorites.find(m => String(m._id || m.movieId) === id);

    // Optimistic: remove immediately
    setFavorites(prev => prev.filter(m => String(m._id || m.movieId) !== id));

    toast("Removed from Favorites 💔", {
      description: removed?.title || "",
      duration: 2000,
    });

    // Sync to backend
    favoritesApi.remove(id).catch((err) => {
      console.error("Failed to remove favorite:", err);
      // Rollback
      if (removed) {
        setFavorites(prev => [removed, ...prev]);
      }
      toast.error("Failed to remove favorite", { description: "Please try again" });
    });
  }, [favorites]);

  const isFavorite = useCallback((movieId) => {
    const id = String(movieId);
    return favorites.some(m => String(m._id || m.movieId) === id);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      favCount: favorites.length,
      loading,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
