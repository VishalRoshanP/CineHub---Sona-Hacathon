/**
 * L1 / L5 CACHE — React Query Hooks for Movie Data
 *
 * Custom hooks that wrap the existing api.* calls with React Query.
 * These provide:
 *   - L1: Automatic caching and deduplication
 *   - L5: Prefetching, background refetch, stale-while-revalidate
 *
 * The existing api.js module is NOT modified — these hooks simply
 * wrap its functions with React Query's caching layer.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "@/lib/api";

// ─── Query Key Factories ───
// Consistent keys for cache invalidation and prefetching
export const movieKeys = {
  all: ["movies"],
  trending: () => [...movieKeys.all, "trending"],
  details: (id) => [...movieKeys.all, "details", id],
  search: (query, type) => [...movieKeys.all, "search", type, query],
};

// ─── L1: Trending Movies ───
export function useTrendingMovies() {
  return useQuery({
    queryKey: movieKeys.trending(),
    queryFn: () => api.getTrending(),
    staleTime: 5 * 60 * 1000,   // Trending is relatively stable — 5 min
    gcTime: 15 * 60 * 1000,     // Keep in cache for 15 min
    refetchOnWindowFocus: true,  // Refresh when user returns
  });
}

// ─── L1: Movie Details ───
export function useMovieDetails(id) {
  return useQuery({
    queryKey: movieKeys.details(id),
    queryFn: () => api.getMovieById(id),
    enabled: !!id,               // Only fetch when id is provided
    staleTime: 10 * 60 * 1000,  // Movie details are very stable — 10 min
    gcTime: 30 * 60 * 1000,     // Keep cached for 30 min
  });
}

// ─── L1: Search Movies ───
export function useSearchMovies(query, type = "title") {
  return useQuery({
    queryKey: movieKeys.search(query, type),
    queryFn: async () => {
      if (type === "title") return api.searchByTitle(query);
      if (type === "plot-text") return api.searchByPlotText(query);
      if (type === "plot-semantic") return api.searchByPlotSemantic(query);
      if (type === "intent") {
        const data = await api.searchByIntent(query);
        // Store intent metadata on the results array for UI access
        const results = data.results || [];
        results._intent = data.intent;
        return results;
      }
      return api.search(query);
    },
    enabled: !!query && query.trim().length > 0,
    staleTime: 2 * 60 * 1000,   // Search results — 2 min
    gcTime: 5 * 60 * 1000,
  });
}

// ─── L5: Prefetch Movie Details ───
// Call this on hover over a movie card to pre-load details
export function usePrefetchMovie() {
  const queryClient = useQueryClient();

  return useCallback(
    (id) => {
      if (!id) return;
      queryClient.prefetchQuery({
        queryKey: movieKeys.details(id),
        queryFn: () => api.getMovieById(id),
        staleTime: 10 * 60 * 1000,
      });
    },
    [queryClient]
  );
}
