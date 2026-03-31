/**
 * CastSearchContext — Lightweight context for triggering cast-based search
 * from any component (MovieDetailModal, TrendingCast, MovieCard).
 *
 * Usage:
 *   const { triggerCastSearch } = useCastSearch();
 *   triggerCastSearch("Leonardo DiCaprio");
 */

import { createContext, useContext, useState, useCallback } from "react";

const CastSearchContext = createContext({
  castQuery: null,
  triggerCastSearch: () => {},
  clearCastSearch: () => {},
});

export function CastSearchProvider({ children }) {
  const [castQuery, setCastQuery] = useState(null);

  const triggerCastSearch = useCallback((actorName) => {
    setCastQuery({ name: actorName, timestamp: Date.now() });
    // Scroll to top for search results
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const clearCastSearch = useCallback(() => {
    setCastQuery(null);
  }, []);

  return (
    <CastSearchContext.Provider value={{ castQuery, triggerCastSearch, clearCastSearch }}>
      {children}
    </CastSearchContext.Provider>
  );
}

export function useCastSearch() {
  return useContext(CastSearchContext);
}
