import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Search, X, Star, Mic, Clock, Sparkles, ChevronDown, Loader2, Zap, Brain, Tag, Hash, MessageCircle, Timer, TrendingUp, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "@/lib/debounce";
import { api } from "@/lib/api";
import { useMovieModal } from "@/contexts/MovieModalContext";
import { useCastSearch } from "@/contexts/CastSearchContext";
import useVoiceSearch from "@/hooks/useVoiceSearch";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { parseIntentClient } from "@/lib/intentParser";

/* ── Recent searches helper (localStorage) ── */
const RECENT_KEY = "cinehub_recent_searches";
const MAX_RECENT = 5;
const RESULTS_PER_PAGE = 5;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, MAX_RECENT);
  } catch { return []; }
}

function addRecentSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const existing = getRecentSearches().filter(s => s !== trimmed);
    localStorage.setItem(RECENT_KEY, JSON.stringify([trimmed, ...existing].slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

/* ── Highlight matching text ── */
function HighlightText({ text, query }) {
  if (!query || !text) return <>{text}</>;
  try {
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-[#F0D060] font-bold">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  } catch { return <>{text}</>; }
}

/* ── Typing placeholder animation ── */
const PLACEHOLDER_TEXTS = [
  'Describe your mood or what you want…',
  'Try "feel-good movie after a long day"',
  'Try "funny movie to watch with friends"',
  'Try "movie like Interstellar but shorter"',
  'Try "emotional movie that makes me cry"',
  'Try "fast-paced thriller with twists"',
  'Try "short romantic movie under 2 hours"',
  'Try "something light for date night"',
];

function useTypingPlaceholder() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % PLACEHOLDER_TEXTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return PLACEHOLDER_TEXTS[index];
}

/* ── Smart suggestion chips ── */
const SMART_SUGGESTIONS = [
  { icon: "😊", label: "Feel-good movie", query: "I want a feel-good uplifting movie" },
  { icon: "😢", label: "Makes me cry", query: "emotional movie that makes me cry" },
  { icon: "🌙", label: "Late night thriller", query: "thriller to watch at night" },
  { icon: "👫", label: "With friends", query: "funny movie to watch with friends" },
  { icon: "💕", label: "Date night", query: "romantic movie for date night" },
  { icon: "🧠", label: "Mind-bending", query: "mind-bending sci-fi with twists" },
  { icon: "🛋️", label: "After long day", query: "light relaxing movie after a long day" },
  { icon: "⚡", label: "Fast-paced action", query: "fast-paced action with strong story" },
  { icon: "🎭", label: "Tom Hanks movies", query: "movies of Tom Hanks" },
  { icon: "🎬", label: "DiCaprio films", query: "movies of Leonardo DiCaprio" },
];

/* ── AI Loading Messages ── */
const AI_LOADING_MESSAGES = [
  "Analyzing your query…",
  "Understanding search intent…",
  "Finding best matches…",
  "Searching the database…",
  "Processing results…",
];

const INTENT_LOADING_MESSAGES = [
  "Understanding your request…",
  "Analyzing mood & context…",
  "Parsing intent & constraints…",
  "Searching intelligently…",
  "Finding the perfect match…",
  "Ranking by multi-factor relevance…",
];

function useLoadingMessage(isLoading) {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (!isLoading) { setMsgIndex(0); return; }
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % AI_LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);
  return isLoading ? AI_LOADING_MESSAGES[msgIndex] : "";
}

/* ── AI Query Understanding ── */
const GENRE_KEYWORDS = {
  "action": ["action", "fight", "battle", "explosion", "chase"],
  "comedy": ["comedy", "funny", "humor", "hilarious", "laugh"],
  "romance": ["romance", "love", "romantic", "love story", "relationship"],
  "horror": ["horror", "scary", "terrifying", "ghost", "haunted"],
  "sci-fi": ["sci-fi", "science fiction", "space", "alien", "futuristic"],
  "thriller": ["thriller", "suspense", "tension", "mysterious"],
  "war": ["war", "military", "soldier", "battlefield", "army"],
  "drama": ["drama", "emotional", "sad", "tragic", "tearjerker"],
  "animation": ["animation", "animated", "cartoon", "anime"],
  "documentary": ["documentary", "real", "true story", "based on"],
};

function classifyQuery(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // Detect genre-based queries
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) {
      return { type: "genre", genre, label: `${genre.charAt(0).toUpperCase() + genre.slice(1)} genre search` };
    }
  }

  // Detect semantic/mood queries
  const moodWords = ["sad", "happy", "dark", "intense", "feel-good", "uplifting", "gritty", "mind-bending"];
  if (moodWords.some(w => q.includes(w))) {
    return { type: "semantic", label: "Mood-based semantic match" };
  }

  // Detect plot-based queries (longer queries)
  if (q.split(" ").length >= 4) {
    return { type: "plot", label: "Plot-based search" };
  }

  return { type: "title", label: "Title search" };
}

/* ── Generate AI explanation for a search result ── */
function getAIExplanation(movie, query) {
  if (!movie || !query) return null;
  const q = query.toLowerCase();
  const title = (movie.title || "").toLowerCase();
  const genres = (movie.genres || []).map(g => g.toLowerCase());
  const plot = ((movie.plot || "") + " " + (movie.fullplot || "")).toLowerCase();

  if (title.includes(q)) return "Title match";
  for (const genre of genres) {
    if (genre.includes(q) || q.includes(genre)) return `Matches ${genre} genre`;
  }
  if (plot.includes(q)) return "Plot keyword match";

  // Check genre keyword matches
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw)) && genres.includes(genre)) {
      return `Matches your ${genre} search`;
    }
  }

  const rating = movie?.imdb?.rating ?? movie?.rating;
  if (rating && parseFloat(rating) >= 8.0) return "Highly rated";
  if (rating && parseFloat(rating) >= 7.0) return "Popular & well-rated";
  return "Semantic match";
}

/* ── Deduplicate results ── */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(movie => {
    const id = movie?._id || movie?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/* ── Skeleton result item ── */
function ResultSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-3 py-3 mx-1.5 rounded-xl">
      <div className="w-12 h-[72px] rounded-lg bg-gray-800/60 shrink-0 overflow-hidden">
        <div className="w-full h-full animate-shimmer-cyan" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-800/50 rounded-md w-3/4 overflow-hidden">
          <div className="w-full h-full animate-shimmer-cyan" />
        </div>
        <div className="h-3 bg-gray-800/30 rounded-md w-1/2 overflow-hidden">
          <div className="w-full h-full animate-shimmer-cyan" />
        </div>
        <div className="h-3 bg-gray-800/20 rounded-md w-5/6 overflow-hidden">
          <div className="w-full h-full animate-shimmer-cyan" />
        </div>
      </div>
      <div className="w-12 h-6 bg-gray-800/40 rounded-md shrink-0 overflow-hidden">
        <div className="w-full h-full animate-shimmer-cyan" />
      </div>
    </div>
  );
}

/* ── Fallback smart suggestions for "no results" state ── */
const FALLBACK_SUGGESTIONS = [
  "emotional drama",
  "feel-good comedy",
  "dark thriller",
  "romantic movie",
  "inspiring true story",
  "sci-fi adventure",
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("smart");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const { openModal } = useMovieModal();
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const searchIdRef = useRef(0); // prevent stale updates
  const placeholder = useTypingPlaceholder();
  const loadingMessage = useLoadingMessage(loading && query.trim());

  const [serverIntent, setServerIntent] = useState(null);
  // Conversational search state
  const sessionIdRef = useRef(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [contextSummary, setContextSummary] = useState(null);

  // Cast search from CastSearchContext
  const { castQuery, clearCastSearch } = useCastSearch();
  const [castSearchActive, setCastSearchActive] = useState(null); // actor name when cast search active
  const [actorMeta, setActorMeta] = useState(null); // { name, filters, total } from server
  const [actorSuggestions, setActorSuggestions] = useState([]); // live actor autocomplete
  const actorSuggestRef = useRef(0); // prevent stale actor suggestions

  // Autocomplete state
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState({ movies: [], actors: [], directors: [] });
  const autocompleteRef = useRef(0); // prevent stale autocomplete
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // "Did you mean?" state
  const [didYouMean, setDidYouMean] = useState(null);
  const [serverSuggestions, setServerSuggestions] = useState([]);

  // Listen for cast search events
  useEffect(() => {
    if (!castQuery) return;
    const actorName = castQuery.name;
    if (!actorName) return;

    setCastSearchActive(actorName);
    setQuery(`movies of ${actorName}`);
    setLoading(true);
    setIsOpen(true);

    api.searchByCast(actorName)
      .then(data => {
        const results = data?.results || [];
        setResults(deduplicateResults(results));
      })
      .catch(err => {
        console.error("Cast search error:", err);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [castQuery]);

  const tabs = [
    { id: "smart", label: "Smart", icon: "🧠" },
    { id: "title", label: "Title", icon: "🔤" },
    { id: "plot-text", label: "Plot (Text)", icon: "📝" },
    { id: "plot-semantic", label: "Plot (AI)", icon: "🤖" },
    { id: "fuzzy", label: "Fuzzy", icon: "✨" },
  ];

  // Client-side intent parsing for real-time badge display
  const clientIntent = useMemo(() => {
    if (activeTab !== "smart" || !query.trim()) return null;
    return parseIntentClient(query);
  }, [query, activeTab]);

  // Use INTENT loading messages when on Smart tab
  const intentLoadingMessage = useMemo(() => {
    if (!loading || activeTab !== "smart") return null;
    const idx = Math.floor(Date.now() / 1500) % INTENT_LOADING_MESSAGES.length;
    return INTENT_LOADING_MESSAGES[idx];
  }, [loading, activeTab]);

  // Reset visible count and active index when results change
  useEffect(() => {
    setVisibleCount(RESULTS_PER_PAGE);
    setActiveIndex(-1);
  }, [results]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < results.length) {
          setVisibleCount(prev => Math.min(prev + RESULTS_PER_PAGE, results.length));
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, results.length]);

  /* ── Search with deduplication and stale-prevention ── */
  const performSearch = useCallback(
    debounce(async (searchQuery, searchType) => {
      const trimmed = String(searchQuery ?? "").trim();
      if (!trimmed) {
        setResults([]);
        setServerIntent(null);
        setIsFollowUp(false);
        setContextSummary(null);
        setLoading(false);
        return;
      }

      const currentId = ++searchIdRef.current;
      setLoading(true);
      let data = [];

      try {
        if (searchType === "smart") {
          const response = await api.searchByIntent(trimmed, sessionIdRef.current);
          data = response.results || [];
          // Only update if still latest
          if (currentId === searchIdRef.current) {
            setServerIntent(response.intent || null);
            setIsFollowUp(response.isFollowUp || false);
            setContextSummary(response.contextSummary || null);
            // "Did you mean?" from server
            setDidYouMean(response.didYouMean || null);
            setServerSuggestions(response.suggestions || []);
            // Persist session ID for conversational follow-ups
            if (response.sessionId) {
              sessionIdRef.current = response.sessionId;
            }
            // Auto-detect cast search from server response
            if (response.actorMeta) {
              setCastSearchActive(response.actorMeta.name);
              setActorMeta(response.actorMeta);
            } else {
              if (!castQuery) {
                setCastSearchActive(null);
                setActorMeta(null);
              }
            }
          }
        } else if (searchType === "title") {
          data = await api.searchByTitle(trimmed);
        } else if (searchType === "plot-text") {
          data = await api.searchByPlotText(trimmed);
        } else if (searchType === "plot-semantic") {
          data = await api.searchByPlotSemantic(trimmed);
        } else if (searchType === "fuzzy") {
          data = await api.searchByTitle(trimmed);
          if (!Array.isArray(data) || data.length === 0) {
            data = await api.search(trimmed);
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }

      // Only update if this is still the latest search
      if (currentId !== searchIdRef.current) return;

      const deduplicated = deduplicateResults(Array.isArray(data) ? data : []);
      setResults(deduplicated);
      setLoading(false);
      setIsOpen(true);
      addRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
    }, 350),
    []
  );

  // Voice search integration
  const handleVoiceResult = useCallback(
    (text) => {
      setQuery(text);
      setIsOpen(true);
      setVoiceOverlayOpen(false);
      performSearch(text, activeTab);
    },
    [activeTab, performSearch]
  );

  const {
    listening,
    voiceStatus,
    voiceText,
    startListening,
    stopListening,
    isSupported: voiceSupported,
    isContinuous,
    toggleContinuous,
  } = useVoiceSearch({ onResult: handleVoiceResult });

  useEffect(() => {
    if (query.trim()) performSearch(query, activeTab);
  }, [activeTab]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Auto-scroll to active item
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = document.getElementById(`search-result-${activeIndex}`);
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  // Query classification
  const queryClassification = useMemo(() => classifyQuery(query), [query]);

  // Keyboard navigation handler for search results
  const handleKeyDown = (e) => {
    if (!showResults || !visibleResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const movie = visibleResults[activeIndex];
      const movieId = movie?._id || movie?.id;
      setIsOpen(false);
      setActiveIndex(-1);
      if (movieId) openModal(movieId);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = e => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);
    // Clear cast search when user types manually
    if (castSearchActive) {
      setCastSearchActive(null);
      setActorMeta(null);
      clearCastSearch();
    }
    const shouldOpen = Boolean(value.trim());
    setIsOpen(shouldOpen);
    if (value.trim()) {
      setLoading(true);
      // Fetch autocomplete suggestions in parallel (all tabs)
      if (value.trim().length >= 2) {
        const acId = ++autocompleteRef.current;
        api.autocomplete(value.trim()).then(acData => {
          if (acId === autocompleteRef.current) {
            setAutocompleteSuggestions(acData || { movies: [], actors: [], directors: [] });
            const hasAny = (acData?.movies?.length || 0) + (acData?.actors?.length || 0) + (acData?.directors?.length || 0) > 0;
            setShowAutocomplete(hasAny);
          }
        }).catch(() => {});
      } else {
        setAutocompleteSuggestions({ movies: [], actors: [], directors: [] });
        setShowAutocomplete(false);
      }
      // Fetch actor suggestions in parallel (Smart tab only)
      if (activeTab === "smart" && value.trim().length >= 2) {
        const suggestId = ++actorSuggestRef.current;
        api.suggestActors(value.trim()).then(suggestions => {
          if (suggestId === actorSuggestRef.current) {
            setActorSuggestions(Array.isArray(suggestions) ? suggestions : []);
          }
        });
      } else {
        setActorSuggestions([]);
      }
    } else {
      setResults([]);
      setActorSuggestions([]);
      setAutocompleteSuggestions({ movies: [], actors: [], directors: [] });
      setShowAutocomplete(false);
      setDidYouMean(null);
      setLoading(false);
    }
    performSearch(value, activeTab);
  };

  const handleTabChange = tabId => {
    setActiveTab(tabId);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setActorSuggestions([]);
    setAutocompleteSuggestions({ movies: [], actors: [], directors: [] });
    setShowAutocomplete(false);
    setDidYouMean(null);
    setServerSuggestions([]);
    setCastSearchActive(null);
    setActorMeta(null);
    setIsOpen(false);
    setLoading(false);
  };

  // Handle clicking an actor suggestion
  const handleActorSuggestionClick = (actor) => {
    const searchQuery = `movies of ${actor.name}`;
    setQuery(searchQuery);
    setCastSearchActive(actor.name);
    setActorMeta({ name: actor.name, filters: {}, total: 0 });
    setActorSuggestions([]);
    setIsOpen(true);
    setLoading(true);
    api.searchByCast(actor.name).then(data => {
      const castResults = data?.results || [];
      setResults(deduplicateResults(castResults));
      setActorMeta(prev => ({ ...prev, total: castResults.length }));
      setLoading(false);
    }).catch(() => {
      setResults([]);
      setLoading(false);
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setIsOpen(true);
    setShowAutocomplete(false);
    setDidYouMean(null);
    performSearch(suggestion, activeTab);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.trim()) {
      setIsOpen(true);
    } else if (recentSearches.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + RESULTS_PER_PAGE, results.length));
  };

  const handleOpenVoiceOverlay = () => {
    setVoiceOverlayOpen(true);
    startListening();
  };

  // Visible results slice
  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );
  const hasMore = visibleCount < results.length;

  // Show suggestions panel? (when focused, no query, and has recent or suggestions)
  const showSuggestions = isFocused && !query.trim() && isOpen;
  const showResults = isOpen && query.trim();
  const hasStaleResults = results.length > 0;

  return (
    <div className="relative w-full z-[9999]">
      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative"
      >
        <div className="relative group">
          {/* Animated border glow — gold */}
          <div className={`absolute -inset-[1.5px] rounded-2xl transition-all duration-500 ${
            isFocused
              ? "animated-border-gradient opacity-60"
              : "bg-gradient-to-r from-[#D4AF37]/20 via-[#F0D060]/10 to-[#D4AF37]/20"
          }`} />

          <div className={`relative bg-[#121217]/90 backdrop-blur-xl border rounded-2xl px-5 py-0 min-h-[56px] flex items-center gap-3.5 transition-all duration-300 shadow-lg ${
            isFocused
              ? "border-[#D4AF37]/50 bg-[#0f1015]/95 shadow-[#D4AF37]/10 shadow-xl"
              : "border-white/[0.12] group-hover:border-white/20 shadow-black/30"
          }`}>
            <Search className={`w-[22px] h-[22px] transition-colors duration-300 shrink-0 ${
              isFocused ? "text-[#D4AF37]" : "text-gray-400"
            }`} />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-[15px] font-medium tracking-wide py-3.5 selection:bg-[#D4AF37]/30"
              role="combobox"
              aria-expanded={showResults}
              aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
              aria-autocomplete="list"
              aria-controls="search-results-list"
            />

            {/* Loading spinner inline */}
            {loading && query.trim() && (
              <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin shrink-0" />
            )}

            {/* Keyboard shortcut hint */}
            {!query && !listening && (
              <div className="hidden sm:flex items-center gap-1 text-gray-500 text-xs shrink-0">
                <kbd className="px-2 py-1 bg-white/[0.08] border border-white/[0.15] rounded-md text-[11px] font-mono text-gray-400">
                  ⌘K
                </kbd>
              </div>
            )}

            {query && (
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={handleClear}
                className="text-gray-400 hover:text-white transition-all duration-200 p-1.5 rounded-lg hover:bg-white/10 shrink-0"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}

            {/* Divider */}
            {voiceSupported && (
              <div className="w-px h-6 bg-white/[0.12] shrink-0" />
            )}

            {/* Voice Search Mic Button — opens Jarvis overlay */}
            {voiceSupported && (
              <div className="flex items-center gap-1.5">
                <motion.button
                  type="button"
                  onClick={handleOpenVoiceOverlay}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.92 }}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shrink-0 ${
                    listening
                      ? "bg-[#D4AF37]/25 text-[#F0D060] animate-mic-pulse ring-2 ring-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/20"
                      : "bg-white/[0.1] text-gray-300 hover:text-[#F0D060] hover:bg-[#D4AF37]/20 hover:ring-2 hover:ring-[#D4AF37]/30 hover:shadow-md hover:shadow-[#D4AF37]/10"
                  }`}
                  title="Voice search (Jarvis mode)"
                  aria-label="Start voice search"
                >
                  <Mic className="w-[20px] h-[20px]" />
                  {listening && (
                    <>
                      <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/40 animate-ping" />
                      <span className="absolute -inset-1 rounded-full border border-[#D4AF37]/20 animate-ping" style={{ animationDelay: "0.3s" }} />
                    </>
                  )}
                </motion.button>

                {/* Continuous voice mode toggle */}
                {toggleContinuous && (
                  <motion.button
                    type="button"
                    onClick={toggleContinuous}
                    whileTap={{ scale: 0.9 }}
                    className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 shrink-0 ${
                      isContinuous
                        ? "bg-[#D4AF37]/30 text-[#F0D060] ring-1 ring-[#D4AF37]/40"
                        : "bg-white/[0.06] text-gray-500 hover:text-[#F0D060] hover:bg-[#D4AF37]/15"
                    }`}
                    title={isContinuous ? "Continuous mode ON (Jarvis)" : "Enable continuous voice mode"}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Voice Feedback Text (inline, below search bar) */}
      <AnimatePresence>
        {voiceStatus !== "idle" && voiceStatus !== "unsupported" && !voiceOverlayOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-2 text-center"
          >
            <span className="text-xs font-medium tracking-wide">
              {voiceStatus === "listening" && (
                <span className="text-[#D4AF37] animate-pulse">🎙️ Listening{isContinuous ? " (Jarvis mode)" : ""}...</span>
              )}
              {voiceStatus === "result" && (
                <span className="text-gray-300">You said: "{voiceText}"</span>
              )}
              {voiceStatus === "searching" && (
                <span className="text-[#F0D060]">Searching for "{voiceText}"...</span>
              )}
              {voiceStatus === "error" && (
                <span className="text-red-400/80">{voiceText}</span>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Smart Suggestions Dropdown (when no query) ── */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-3 bg-[#121217]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl z-[9999] overflow-hidden"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 50px rgba(212,175,55,0.08)" }}
            onMouseDown={e => e.preventDefault()}
          >
            {/* Smart Suggestion Chips */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick search</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SMART_SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSuggestionClick(s.query)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-[#D4AF37]/10 to-[#F0D060]/10 border border-white/[0.08] text-gray-300 hover:text-white hover:border-[#D4AF37]/30 hover:from-[#D4AF37]/20 hover:to-[#F0D060]/15 transition-all duration-200"
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all duration-150 flex items-center gap-2.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      {search}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dropdown Results ── */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-3 bg-[#121217]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl z-[9999] flex flex-col"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 50px rgba(212,175,55,0.08)" }}
          >
            {/* Tabs — sticky */}
            <div className="flex border-b border-white/[0.08] p-2.5 gap-1.5 sticky top-0 bg-[#121217]/98 backdrop-blur-xl z-10 rounded-t-2xl">
              {tabs.map(tab => (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-[#D4AF37]/80 to-[#B8941E]/80 text-white shadow-md shadow-[#D4AF37]/25"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]"
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-[11px]">{tab.icon}</span>
                  {tab.label}
                </motion.button>
              ))}
            </div>

            {/* Conversational Follow-up Indicator */}
            {activeTab === "smart" && isFollowUp && contextSummary && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2 border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/[0.06] to-transparent"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium text-cyan-300/90">{contextSummary}</span>
                </div>
              </motion.div>
            )}

            {/* Intent Display Panel (Smart tab) */}
            {activeTab === "smart" && query.trim() && (clientIntent || serverIntent) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="px-4 py-2.5 border-b border-white/[0.06] bg-gradient-to-r from-[#D4AF37]/[0.04] to-transparent"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Parsed Intent</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {/* Genre badges */}
                  {(serverIntent?.genres || clientIntent?.genres || []).map((g, i) => (
                    <motion.span
                      key={`genre-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/20 text-purple-300 font-medium"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {g}
                    </motion.span>
                  ))}
                  {/* Mood badges */}
                  {(serverIntent?.moods || clientIntent?.moods || []).map((m, i) => (
                    <motion.span
                      key={`mood-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 1) * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-400/20 text-pink-300 font-medium"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {m}
                    </motion.span>
                  ))}
                  {/* Context badges */}
                  {(clientIntent?.contexts || []).map((ctx, i) => (
                    <motion.span
                      key={`ctx-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 2) * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 font-medium"
                    >
                      {ctx.label}
                    </motion.span>
                  ))}
                  {/* Also show server-side contexts if available */}
                  {(serverIntent?.contexts || []).filter(c => typeof c === 'string').map((ctx, i) => (
                    <motion.span
                      key={`sctx-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 3) * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 font-medium"
                    >
                      📌 {ctx}
                    </motion.span>
                  ))}
                  {/* Constraint badges */}
                  {(clientIntent?.constraints || []).map((c, i) => (
                    <motion.span
                      key={`cst-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 3) * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/20 text-orange-300 font-medium"
                    >
                      {c.label}
                    </motion.span>
                  ))}
                  {/* Keyword badges */}
                  {(serverIntent?.keywords || clientIntent?.keywords || []).slice(0, 5).map((kw, i) => (
                    <motion.span
                      key={`kw-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 4) * 0.05 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/15 text-[#F0D060]/80 font-medium"
                    >
                      <Hash className="w-2.5 h-2.5" />
                      {kw}
                    </motion.span>
                  ))}
                  {/* Reference title */}
                  {(serverIntent?.referenceTitle || clientIntent?.referenceTitle) && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/20 text-cyan-300 font-medium"
                    >
                      🎬 like "{serverIntent?.referenceTitle || clientIntent?.referenceTitle}"
                    </motion.span>
                  )}
                  {/* Director badge */}
                  {(serverIntent?.directorName) && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-amber-300 font-medium"
                    >
                      🎥 {serverIntent.directorName}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Query Understanding Badge (non-smart tabs) */}
            {activeTab !== "smart" && queryClassification && query.trim() && (
              <div className="px-4 py-2 border-b border-white/[0.04]">
                <div className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/12 text-[#F0D060]/70 font-medium">
                  <Brain className="w-3 h-3" />
                  {queryClassification.label}
                </div>
              </div>
            )}

            {/* ── Autocomplete Suggestions Dropdown ── */}
            {showAutocomplete && !castSearchActive && !loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border-b border-white/[0.06]"
              >
                <div className="px-4 py-2.5">
                  {/* Movie suggestions */}
                  {autocompleteSuggestions.movies?.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px]">🎬</span>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Movies</span>
                      </div>
                      {autocompleteSuggestions.movies.map((m, idx) => (
                        <motion.button
                          key={m._id || idx}
                          type="button"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setShowAutocomplete(false);
                            setQuery(m.title);
                            performSearch(m.title, activeTab);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all text-left group/ac"
                        >
                          {m.poster && (
                            <img src={m.poster} alt="" className="w-7 h-10 rounded object-cover shrink-0 border border-white/[0.06]" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-200 group-hover/ac:text-white truncate">
                              <HighlightText text={m.title} query={query} />
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {m.year}{m.rating ? ` · ★ ${parseFloat(m.rating).toFixed(1)}` : ""}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  {/* Actor suggestions */}
                  {autocompleteSuggestions.actors?.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px]">🎭</span>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actors</span>
                      </div>
                      {autocompleteSuggestions.actors.map((a, idx) => (
                        <motion.button
                          key={a.name}
                          type="button"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setShowAutocomplete(false);
                            handleActorSuggestionClick({ name: a.name, movieCount: a.movieCount });
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all text-left group/ac"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-white">{a.name.split(" ").map(w => w[0]).join("").slice(0,2)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-200 group-hover/ac:text-white truncate">
                              <HighlightText text={a.name} query={query} />
                            </div>
                            <span className="text-[10px] text-gray-500">{a.movieCount} movies · ★ {a.avgRating}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  {/* Director suggestions */}
                  {autocompleteSuggestions.directors?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px]">🎥</span>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Directors</span>
                      </div>
                      {autocompleteSuggestions.directors.map((d, idx) => (
                        <motion.button
                          key={d.name}
                          type="button"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setShowAutocomplete(false);
                            setQuery(`${d.name} movies`);
                            performSearch(`${d.name} movies`, "smart");
                            setActiveTab("smart");
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all text-left group/ac"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-white">{d.name.split(" ").map(w => w[0]).join("").slice(0,2)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-200 group-hover/ac:text-white truncate">
                              <HighlightText text={d.name} query={query} />
                            </div>
                            <span className="text-[10px] text-gray-500">{d.movieCount} movies · ★ {d.avgRating}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── "Did You Mean?" Banner ── */}
            {didYouMean && activeTab === "smart" && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2.5 border-b border-white/[0.06] bg-gradient-to-r from-[#D4AF37]/[0.06] to-transparent"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                  <span className="text-[12px] text-gray-400">Did you mean</span>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSuggestionClick(didYouMean)}
                    className="text-[12px] font-semibold text-[#F0D060] hover:text-white transition-colors underline decoration-[#D4AF37]/40 underline-offset-2"
                  >
                    "{didYouMean}"
                  </motion.button>
                  <span className="text-[12px] text-gray-400">?</span>
                </div>
              </motion.div>
            )}

            {/* ── Actor Suggestions Section ── */}
            {activeTab === "smart" && actorSuggestions.length > 0 && !castSearchActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-white/[0.06]"
              >
                <div className="px-4 pt-2.5 pb-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3 h-3 text-[#D4AF37]" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actors</span>
                  </div>
                  <div className="space-y-0.5">
                    {actorSuggestions.map((actor, idx) => {
                      const colors = [
                        "from-purple-500 to-pink-500", "from-cyan-500 to-blue-500",
                        "from-amber-500 to-orange-500", "from-emerald-500 to-teal-500",
                        "from-rose-500 to-red-500",
                      ];
                      let hash = 0;
                      for (const ch of actor.name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
                      const avatarColor = colors[Math.abs(hash) % colors.length];
                      const initials = actor.name.split(" ").map(w => w[0]).join("").slice(0, 2);

                      return (
                        <motion.button
                          key={actor.name}
                          type="button"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleActorSuggestionClick(actor)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group/actor cursor-pointer"
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center border border-white/10 group-hover/actor:border-[#D4AF37]/40 transition-colors shrink-0 shadow-md`}>
                            <span className="text-xs font-bold text-white">{initials}</span>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm font-semibold text-gray-200 group-hover/actor:text-white transition-colors">
                              <HighlightText text={actor.name} query={query} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-500">{actor.movieCount} movies</span>
                              <span className="text-gray-700">·</span>
                              <span className="text-[10px] text-yellow-400/70">★ {actor.avgRating}</span>
                              {actor.topGenres && actor.topGenres.length > 0 && (
                                <>
                                  <span className="text-gray-700">·</span>
                                  <span className="text-[10px] text-gray-500">{actor.topGenres.slice(0, 2).join(", ")}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-[#D4AF37]/60 group-hover/actor:text-[#F0D060] transition-colors shrink-0">View movies →</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Actor Banner (when cast search active) ── */}
            {castSearchActive && !loading && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-3 mt-2 mb-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37]/[0.08] via-[#F0D060]/[0.04] to-transparent border border-[#D4AF37]/15"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {(() => {
                    const colors = ["from-purple-500 to-pink-500", "from-cyan-500 to-blue-500", "from-amber-500 to-orange-500", "from-emerald-500 to-teal-500"];
                    let hash = 0;
                    for (const ch of castSearchActive) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
                    const avatarColor = colors[Math.abs(hash) % colors.length];
                    const initials = castSearchActive.split(" ").map(w => w[0]).join("").slice(0, 2);
                    return (
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center border-2 border-white/10 shadow-lg shrink-0`}>
                        <span className="text-sm font-bold text-white">{initials}</span>
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">Movies by {castSearchActive}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {results.length} movie{results.length !== 1 ? "s" : ""} found
                      {actorMeta?.filters?.genre && <span className="text-[#F0D060]"> · {actorMeta.filters.genre}</span>}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setCastSearchActive(null);
                      setActorMeta(null);
                      clearCastSearch();
                      setQuery("");
                      setResults([]);
                      setIsOpen(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all shrink-0"
                    title="Clear actor filter"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Results count + loading indicator bar */}
            {hasStaleResults && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] sticky top-[44px] bg-[#121217]/98 backdrop-blur-xl z-10">
                <span className="text-[11px] font-medium text-gray-500">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" />
                      <span className="animate-ai-text">{activeTab === "smart" ? intentLoadingMessage || loadingMessage : loadingMessage}</span>
                    </span>
                  ) : castSearchActive ? (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-[#D4AF37]" />
                      <span className="text-[#F0D060] font-semibold">Results for: {castSearchActive}</span>
                      <span className="text-gray-500">· {results.length} movie{results.length !== 1 ? "s" : ""}</span>
                    </span>
                  ) : (
                    `${results.length} result${results.length !== 1 ? "s" : ""} found`
                  )}
                </span>
                <span className="text-[11px] text-gray-600">
                  Showing {Math.min(visibleCount, results.length)} of {results.length}
                </span>
              </div>
            )}

            {/* AI loading state (no stale results) */}
            {loading && !hasStaleResults && (
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                  <Sparkles className="w-3 h-3 text-[#D4AF37] animate-pulse" />
                  <span className="animate-ai-text">{activeTab === "smart" ? intentLoadingMessage || loadingMessage : loadingMessage}</span>
                </span>
              </div>
            )}

            {/* Scrollable results container */}
            <div className="relative">
              <div
                ref={scrollContainerRef}
                className="overflow-y-auto max-h-[70vh] scroll-smooth search-results-scroll"
              >
                {/* Loading state — skeleton OR overlay on stale results */}
                {loading && !hasStaleResults ? (
                  <div className="p-2">
                    {[...Array(5)].map((_, idx) => (
                      <ResultSkeleton key={idx} />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="relative">
                    {/* Stale-while-loading overlay */}
                    {loading && (
                      <div className="absolute inset-0 bg-[#121217]/40 z-10 pointer-events-none flex items-start justify-center pt-8">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121217]/90 border border-[#D4AF37]/20">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                          <span className="text-xs text-gray-300">Updating results…</span>
                        </div>
                      </div>
                    )}

                    <ul id="search-results-list" role="listbox" className={`py-1.5 ${loading ? "opacity-60" : ""} transition-opacity duration-200`}>
                      {visibleResults.map((movie, idx) => {
                        const id = movie?._id || movie?.id;
                        const poster =
                          movie?.poster ||
                          movie?.poster_url ||
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120' fill='%23111318'%3E%3Crect width='80' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='9'%3ENo Poster%3C/text%3E%3C/svg%3E";
                        const ratingVal = movie?.imdb?.rating ?? movie?.rating;
                        const rating = ratingVal
                          ? parseFloat(ratingVal).toFixed(1)
                          : null;
                        const plotSnippet = movie?.plot || movie?.fullplot || "";
                        const truncatedPlot = plotSnippet.length > 90
                          ? plotSnippet.slice(0, 90) + "…"
                          : plotSnippet;
                        const isActive = idx === activeIndex;
                        const aiReason = (activeTab === "smart" && movie.explanation) ? movie.explanation : getAIExplanation(movie, query);

                        return (
                          <motion.li
                            key={id || `result-${idx}`}
                            id={`search-result-${idx}`}
                            role="option"
                            aria-selected={isActive}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(idx, 6) * 0.03 }}
                            className={`px-3 py-3 transition-all duration-200 cursor-pointer group/item mx-1.5 rounded-xl border ${
                              isActive
                                ? "bg-[#D4AF37]/[0.08] border-[#D4AF37]/25 shadow-[inset_0_0_30px_rgba(212,175,55,0.06)] scale-[1.01]"
                                : "border-transparent hover:bg-white/[0.06] hover:shadow-[inset_0_0_20px_rgba(212,175,55,0.03)] hover:border-white/[0.06]"
                            }`}
                            onMouseDown={e => e.preventDefault()}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => {
                              const movieId = movie?._id || movie?.id;
                              setIsOpen(false);
                              setActiveIndex(-1);
                              if (movieId) openModal(movieId);
                            }}
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Poster thumbnail */}
                              <div className="relative w-12 h-[72px] rounded-lg overflow-hidden bg-gray-800/50 shrink-0 border border-white/[0.06] group-hover/item:border-[#D4AF37]/20 transition-colors duration-200">
                                <img
                                  src={poster}
                                  alt=""
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                                  onError={e => {
                                    e.currentTarget.src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120' fill='%23111318'%3E%3Crect width='80' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='9'%3ENo Poster%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              </div>

                              {/* Details */}
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-semibold text-sm leading-tight group-hover/item:text-[#F0D060] transition-colors line-clamp-1">
                                  <HighlightText text={movie?.title || "Untitled"} query={query} />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400 font-medium">
                                    {movie?.year || ""}
                                  </span>
                                  {movie?.genres && movie.genres.length > 0 && (
                                    <>
                                      <span className="text-gray-600">•</span>
                                      <div className="flex items-center gap-1.5 overflow-hidden">
                                        {movie.genres.slice(0, 2).map((genre, gi) => (
                                          <span key={gi} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 font-medium shrink-0">
                                            {genre}
                                          </span>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* Plot snippet */}
                                {truncatedPlot && (
                                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 leading-relaxed">
                                    {truncatedPlot}
                                  </p>
                                )}
                                {/* AI Explanation badge */}
                                {aiReason && (
                                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/15 text-[#F0D060]/80 font-medium">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {aiReason}
                                  </div>
                                )}
                              </div>

                              {/* Rating badge */}
                              {rating && (
                                <div className="flex items-center gap-1 text-xs shrink-0 bg-black/30 px-2 py-1 rounded-md border border-white/[0.06] group-hover/item:border-[#D4AF37]/20 transition-colors mt-0.5">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-gray-300 font-semibold">
                                    {rating}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}

                      {/* Infinite scroll sentinel + Load More */}
                      {hasMore && (
                        <li ref={loadMoreRef} className="px-4 py-3 flex flex-col items-center gap-2">
                          <motion.button
                            type="button"
                            onClick={handleLoadMore}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onMouseDown={e => e.preventDefault()}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#D4AF37]/15 to-[#F0D060]/10 border border-[#D4AF37]/15 text-gray-300 hover:text-white hover:border-[#D4AF37]/30 transition-all duration-200 text-xs font-medium"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show more ({results.length - visibleCount} remaining)
                          </motion.button>
                        </li>
                      )}

                      {/* All loaded indicator */}
                      {!hasMore && results.length > RESULTS_PER_PAGE && (
                        <li className="px-4 py-2 text-center">
                          <span className="text-[10px] text-gray-600">
                            All {results.length} results loaded
                          </span>
                        </li>
                      )}
                    </ul>

                    {/* Keyboard navigation hint bar */}
                    {visibleResults.length > 0 && !loading && (
                      <div className="sticky bottom-0 px-4 py-2 border-t border-white/[0.06] bg-[#121217]/98 backdrop-blur-xl flex items-center justify-between text-[10px] text-gray-500 z-10">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-[9px] font-mono text-gray-400">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-[9px] font-mono text-gray-400">↓</kbd>
                            <span className="ml-0.5">Navigate</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-[9px] font-mono text-gray-400">↵</kbd>
                            <span className="ml-0.5">Select</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-[9px] font-mono text-gray-400">Esc</kbd>
                            <span className="ml-0.5">Close</span>
                          </span>
                        </div>
                        {activeIndex >= 0 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[#D4AF37]/70 font-medium"
                          >
                            Press Enter to select
                          </motion.span>
                        )}
                      </div>
                    )}
                  </div>
                ) : !loading ? (
                  <div className="p-10 text-center">
                    <div className="text-4xl mb-3">{activeTab === "smart" ? "🧠" : "🎬"}</div>
                    <p className="text-gray-300 text-sm font-semibold">
                      No exact match found for "{query}"
                    </p>
                    <p className="text-gray-500 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                      {activeTab === "smart"
                        ? "Try describing what you're in the mood for, or use a suggestion below:"
                        : "Try different keywords, check spelling, or switch search mode above"
                      }
                    </p>
                    {/* Smart fallback suggestions */}
                    {activeTab === "smart" && (
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {FALLBACK_SUGGESTIONS.map((s, i) => (
                          <motion.button
                            key={i}
                            type="button"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleSuggestionClick(s)}
                            onMouseDown={e => e.preventDefault()}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/15 text-[#F0D060]/80 hover:text-white hover:border-[#D4AF37]/30 transition-all duration-200 font-medium"
                          >
                            {s}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    {activeTab !== "smart" && (
                      <motion.button
                        type="button"
                        onClick={() => handleTabChange("smart")}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onMouseDown={e => e.preventDefault()}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#F0D060] transition-colors font-medium"
                      >
                        <Brain className="w-3 h-3" />
                        Try Smart Search instead
                      </motion.button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Bottom fade gradient — scroll indicator */}
              {results.length > 4 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#121217]/90 to-transparent pointer-events-none z-20 rounded-b-2xl" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop Click to Close */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40"
        />
      )}

      {/* Jarvis Voice Overlay */}
      <VoiceSearchOverlay
        isOpen={voiceOverlayOpen}
        onClose={() => {
          setVoiceOverlayOpen(false);
          if (listening) stopListening();
        }}
        listening={listening}
        voiceStatus={voiceStatus}
        voiceText={voiceText}
        startListening={startListening}
        stopListening={stopListening}
        isContinuous={isContinuous}
        toggleContinuous={toggleContinuous}
      />
    </div>
  );
}
