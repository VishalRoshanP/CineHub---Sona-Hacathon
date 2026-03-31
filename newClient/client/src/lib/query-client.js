/**
 * L1 / L5 CACHE — React Query Client Configuration
 *
 * Configures the QueryClient with optimized defaults:
 *   - staleTime: 5 min (data considered fresh, no refetch)
 *   - gcTime: 10 min (cached data kept in memory after unmount)
 *   - Background refetch on window focus
 *   - Automatic deduplication of concurrent requests
 *   - Retry with exponential backoff
 */

import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // L1: Data stays fresh for 5 minutes — prevents redundant API calls
      staleTime: 5 * 60 * 1000,

      // L5: Cached data kept for 10 minutes after all observers unmount
      gcTime: 10 * 60 * 1000,

      // L5: Refetch stale data when user returns to the tab
      refetchOnWindowFocus: true,

      // L5: Don't refetch when component remounts (if data is still fresh)
      refetchOnMount: false,

      // Retry failed requests (2 retries with exponential backoff)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

      // Keep previous data visible while refetching
      placeholderData: (previousData) => previousData,
    },
  },
});

export default queryClient;
