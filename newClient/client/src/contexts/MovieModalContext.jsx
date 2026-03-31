/**
 * MovieModalContext — with L1/L5 React Query integration
 *
 * Uses queryClient.fetchQuery() to leverage React Query's cache when
 * opening the movie detail modal. If the movie data is already cached
 * (e.g. from a prefetch on hover), it's served instantly without an API call.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { movieKeys } from "@/hooks/useMovieQueries";

const MovieModalContext = createContext(null);

export function MovieModalProvider({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const queryClient = useQueryClient();

  const openModal = useCallback(async (movieId) => {
    if (!movieId) return;
    setIsModalOpen(true);
    setModalLoading(true);
    setSelectedMovie(null);

    try {
      // L1/L5: Use React Query's fetchQuery — serves from cache if available,
      // otherwise fetches and caches the result
      const data = await queryClient.fetchQuery({
        queryKey: movieKeys.details(movieId),
        queryFn: () => api.getMovieById(movieId),
        staleTime: 10 * 60 * 1000, // 10 min
      });
      setSelectedMovie(data);
    } catch (err) {
      console.error("Failed to fetch movie details:", err);
    } finally {
      setModalLoading(false);
    }
  }, [queryClient]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Delay clearing data so exit animation can play
    setTimeout(() => {
      setSelectedMovie(null);
      setModalLoading(false);
    }, 300);
  }, []);

  return (
    <MovieModalContext.Provider
      value={{ isModalOpen, selectedMovie, modalLoading, openModal, closeModal }}
    >
      {children}
    </MovieModalContext.Provider>
  );
}

export function useMovieModal() {
  const ctx = useContext(MovieModalContext);
  if (!ctx) {
    throw new Error("useMovieModal must be used within MovieModalProvider");
  }
  return ctx;
}
