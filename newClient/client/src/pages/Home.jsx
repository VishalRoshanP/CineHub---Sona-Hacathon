import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  Film,
  SlidersHorizontal,
  X,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";
import MovieCardSkeleton from "@/components/MovieCardSkeleton";
import ThreeBackground from "@/components/ThreeBackground";
import FilterPanel from "@/components/FilterPanel";
import RecommendationSection from "@/components/RecommendationSection";
import TrendingCast from "@/components/TrendingCast";
import WatchHistory from "@/components/WatchHistory";
import { useTrendingMovies } from "@/hooks/useMovieQueries";
import { useFavorites } from "@/contexts/FavoritesContext";

/* ── Floating Particles (gold theme) ── */
function FloatingParticles() {
  const particles = [
    { className: "particle particle-gold", size: 6, top: "15%", left: "10%", delay: "0s" },
    { className: "particle particle-amber", size: 8, top: "25%", left: "85%", delay: "2s" },
    { className: "particle particle-warm", size: 5, top: "60%", left: "20%", delay: "4s" },
    { className: "particle particle-gold", size: 4, top: "40%", left: "75%", delay: "1s" },
    { className: "particle particle-amber", size: 7, top: "70%", left: "50%", delay: "3s" },
    { className: "particle particle-warm", size: 5, top: "30%", left: "45%", delay: "5s" },
    { className: "particle particle-gold", size: 3, top: "80%", left: "30%", delay: "6s" },
    { className: "particle particle-amber", size: 6, top: "50%", left: "65%", delay: "2.5s" },
    { className: "particle particle-gold", size: 4, top: "20%", left: "55%", delay: "7s" },
    { className: "particle particle-warm", size: 5, top: "75%", left: "80%", delay: "3.5s" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className={p.className}
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ── Apply client-side filters + sort ── */
function applyFilters(movies, filters) {
  if (!filters) return movies;
  let result = movies.filter(movie => {
    // Genre filter
    if (filters.genres && filters.genres.length > 0) {
      const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
      const hasMatch = filters.genres.some(g => movieGenres.includes(g.toLowerCase()));
      if (!hasMatch) return false;
    }
    // Year filter
    const year = parseInt(movie.year);
    if (!isNaN(year)) {
      if (filters.yearMin && year < filters.yearMin) return false;
      if (filters.yearMax && year > filters.yearMax) return false;
    }
    // Rating filter
    const rating = parseFloat(movie?.imdb?.rating ?? movie?.rating);
    if (!isNaN(rating) && filters.ratingMin && rating < filters.ratingMin) return false;
    // Language filter
    if (filters.language) {
      const langs = (movie.languages || []).map(l => l.toLowerCase());
      if (!langs.includes(filters.language.toLowerCase())) return false;
    }
    return true;
  });

  // Sort
  if (filters.sortBy) {
    result = [...result].sort((a, b) => {
      if (filters.sortBy === "rating") {
        const ra = parseFloat(a?.imdb?.rating ?? a?.rating ?? 0);
        const rb = parseFloat(b?.imdb?.rating ?? b?.rating ?? 0);
        return rb - ra;
      }
      if (filters.sortBy === "latest") {
        const ya = parseInt(a.year) || 0;
        const yb = parseInt(b.year) || 0;
        return yb - ya;
      }
      if (filters.sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // popularity — default order from API (most popular first)
      return 0;
    });
  }

  return result;
}

/* ── Active Filter Tags ── */
function ActiveFilterTags({ filters, onFilterChange }) {
  if (!filters) return null;
  const tags = [];

  if (filters.genres?.length > 0) {
    filters.genres.forEach(g => tags.push({ label: g, type: "genre", value: g }));
  }
  if (filters.yearMin && filters.yearMin > 1920) {
    tags.push({ label: `From ${filters.yearMin}`, type: "yearMin" });
  }
  if (filters.yearMax && filters.yearMax < 2025) {
    tags.push({ label: `Until ${filters.yearMax}`, type: "yearMax" });
  }
  if (filters.ratingMin && filters.ratingMin > 0) {
    tags.push({ label: `★ ${filters.ratingMin}+`, type: "ratingMin" });
  }
  if (filters.language) {
    tags.push({ label: filters.language, type: "language" });
  }
  if (filters.sortBy && filters.sortBy !== "popularity") {
    const sortLabels = { rating: "Rating ↓", latest: "Latest ↓", title: "A-Z" };
    tags.push({ label: sortLabels[filters.sortBy] || filters.sortBy, type: "sortBy" });
  }

  if (tags.length === 0) return null;

  const removeTag = (tag) => {
    const updated = { ...filters };
    if (tag.type === "genre") {
      updated.genres = (updated.genres || []).filter(g => g !== tag.value);
    } else if (tag.type === "yearMin") {
      updated.yearMin = 1920;
    } else if (tag.type === "yearMax") {
      updated.yearMax = 2025;
    } else if (tag.type === "ratingMin") {
      updated.ratingMin = 0;
    } else if (tag.type === "language") {
      updated.language = "";
    } else if (tag.type === "sortBy") {
      updated.sortBy = "popularity";
    }
    onFilterChange(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 mt-4"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]/60" />
      {tags.map((tag, i) => (
        <motion.span
          key={`${tag.type}-${tag.label}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => removeTag(tag)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#F0D060] cursor-pointer hover:bg-[#D4AF37]/20 transition-colors"
        >
          {tag.label}
          <X className="w-3 h-3 opacity-60 hover:opacity-100" />
        </motion.span>
      ))}
    </motion.div>
  );
}

/* ── Stagger Container ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Home() {
  const { data: trendingData, isLoading: loading } = useTrendingMovies();
  const trendingMovies = Array.isArray(trendingData) ? trendingData : [];

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(15);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(null);
  const moreSectionRef = useRef(null);
  const { favorites } = useFavorites();

  const itemsPerView = 5;

  // Generate recommendations: favorites-based if available, else trending-based
  const recommendations = useMemo(() => {
    if (favorites.length > 0) {
      // Extract top genres from favorites
      const genreCounts = {};
      favorites.forEach(m => {
        (m.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
      });
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g.toLowerCase());
      const favIds = new Set(favorites.map(m => String(m._id || m.id)));

      // Find trending movies matching favorite genres that aren't already favorited
      return trendingMovies
        .filter(m => {
          const id = String(m._id || m.id);
          if (favIds.has(id)) return false;
          const movieGenres = (m.genres || []).map(g => g.toLowerCase());
          return topGenres.some(g => movieGenres.includes(g));
        })
        .slice(0, 15);
    }

    // Fallback: top rated from trending
    return trendingMovies
      .filter(m => {
        const r = parseFloat(m?.imdb?.rating ?? m?.rating);
        return !isNaN(r) && r >= 7.0;
      })
      .slice(0, 15);
  }, [trendingMovies, favorites]);

  // Apply filters to all movies
  const filteredMovies = useMemo(
    () => applyFilters(trendingMovies, filters),
    [trendingMovies, filters]
  );

  const maxIndex = Math.max(0, filteredMovies.length - itemsPerView);

  const handlePrev = () => {
    setCarouselIndex(Math.max(0, carouselIndex - 1));
  };

  const handleNext = () => {
    setCarouselIndex(Math.min(maxIndex, carouselIndex + 1));
  };

  const canLoadMore = visibleCount < filteredMovies.length;
  const handleLoadMore = () => {
    setVisibleCount(c => Math.min(filteredMovies.length, c + 15));
    setTimeout(
      () => moreSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  };

  const gridMovies = useMemo(
    () => filteredMovies.slice(0, visibleCount),
    [filteredMovies, visibleCount]
  );

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setVisibleCount(15);
    setCarouselIndex(0);
  }, []);

  const hasActiveFilters = filters && (
    (filters.genres && filters.genres.length > 0) ||
    (filters.yearMin && filters.yearMin > 1920) ||
    (filters.yearMax && filters.yearMax < 2025) ||
    (filters.ratingMin && filters.ratingMin > 0) ||
    (filters.language) ||
    (filters.sortBy && filters.sortBy !== "popularity")
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0B0F] via-[#0e0e14] to-[#0B0B0F] text-white">
      <ThreeBackground />
      <Navbar />

      {/* ═══ CINEMATIC HERO SECTION ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative pt-28 pb-24 px-4 sm:px-6 lg:px-8 overflow-visible z-50"
      >
        {/* Animated gradient background — gold */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/30" />
          <motion.div
            animate={{
              background: [
                "radial-gradient(ellipse at 20% 50%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)",
                "radial-gradient(ellipse at 80% 30%, rgba(240, 208, 96, 0.1) 0%, transparent 60%)",
                "radial-gradient(ellipse at 50% 60%, rgba(255, 234, 167, 0.08) 0%, transparent 60%)",
                "radial-gradient(ellipse at 30% 40%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)",
                "radial-gradient(ellipse at 70% 50%, rgba(240, 208, 96, 0.1) 0%, transparent 60%)",
                "radial-gradient(ellipse at 20% 50%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)",
              ],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          />
        </div>

        {/* Floating particles overlay */}
        <FloatingParticles />

        <div className="max-w-3xl mx-auto text-center relative">

          {/* AI badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-xs font-semibold text-[#F0D060] tracking-wide">AI-Powered Discovery</span>
          </motion.div>

          {/* Main Heading — gradient text with glow */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-6 leading-[1.08] tracking-tight"
          >
            <span className="text-white">Discover Movies</span>
            <br />
            <span className="text-glow-gradient">Like Never Before</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-gray-300/80 text-base sm:text-lg mb-12 max-w-xl mx-auto leading-relaxed"
          >
            Search by title, plot, or voice. Explore trending movies with
            intelligent AI-powered recommendations.
          </motion.p>

          {/* ── Spotlight Glow Behind Search Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-2xl mx-auto"
          >
            {/* Spotlight glow — gold */}
            <div className="absolute -inset-10 bg-gradient-to-r from-[#D4AF37]/10 via-[#F0D060]/8 to-[#FFEAA7]/6 rounded-3xl blur-3xl animate-spotlight pointer-events-none" />
            <div className="relative">
              <SearchBar />
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-14 flex flex-col items-center gap-2"
          >
            <span className="text-xs text-gray-500 font-medium tracking-wider uppercase">Scroll to explore</span>
            <motion.div
              className="animate-scroll-bounce"
            >
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </motion.div>
          </motion.div>

        </div>
      </motion.section>

      {/* ═══ WATCH HISTORY — Continue Watching ═══ */}
      <WatchHistory />

      {/* ═══ TRENDING ACTORS ═══ */}
      <TrendingCast />

      {/* ═══ TRENDING MOVIES SECTION ═══ */}
      <section id="trending" className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F0D060]/20 border border-[#D4AF37]/20 shadow-lg shadow-[#D4AF37]/5">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  <span className="text-gradient-cinematic">Trending Now</span>
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Top rated movies this season
                  {hasActiveFilters && (
                    <span className="ml-2 text-[#F0D060]">
                      · {filteredMovies.length} result{filteredMovies.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Filter Button */}
            <motion.button
              type="button"
              onClick={() => setFilterOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                hasActiveFilters
                  ? "bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#F0D060]"
                  : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              )}
            </motion.button>
          </motion.div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <ActiveFilterTags filters={filters} onFilterChange={handleFilterChange} />
          )}

          {/* Carousel */}
          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, idx) => (
                  <MovieCardSkeleton key={idx} />
                ))}
              </div>
            ) : filteredMovies.length > 0 ? (
              <div className="relative group">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="overflow-hidden"
                >
                  <motion.div
                    animate={{
                      x: -carouselIndex * (100 / itemsPerView) + "%",
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="flex gap-4"
                    style={{
                      width: `${
                        (filteredMovies.length / itemsPerView) * 100
                      }%`,
                    }}
                  >
                    {filteredMovies.map((movie, idx) => (
                      <motion.div
                        key={movie._id || movie.id || idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.04 }}
                        viewport={{ once: true }}
                        style={{
                          width: `${100 / itemsPerView}%`,
                          minWidth: 0,
                        }}
                      >
                        <MovieCard movie={movie} />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* Navigation Buttons */}
                {filteredMovies.length > itemsPerView && (
                  <>
                    <motion.button
                      onClick={handlePrev}
                      disabled={carouselIndex === 0}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute -left-3 top-1/3 -translate-y-1/2 z-10 w-11 h-11 bg-black/60 backdrop-blur-md hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg shadow-black/30 hover:border-[#D4AF37]/30"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                      onClick={handleNext}
                      disabled={carouselIndex >= maxIndex}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute -right-3 top-1/3 -translate-y-1/2 z-10 w-11 h-11 bg-black/60 backdrop-blur-md hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg shadow-black/30 hover:border-[#D4AF37]/30"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-16"
              >
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-gray-300 text-sm">
                  {hasActiveFilters ? "No movies match your filters" : "No trending movies available"}
                </p>
                {hasActiveFilters && (
                  <motion.button
                    type="button"
                    onClick={() => setFilters(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-3 text-xs text-[#D4AF37] hover:text-[#F0D060] transition-colors"
                  >
                    Clear filters
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ RECOMMENDED FOR YOU ═══ */}
      {recommendations.length > 0 && (
        <RecommendationSection
          movies={recommendations}
          title={favorites.length > 0 ? "Because You Liked" : "Recommended for You"}
        />
      )}

      {/* ═══ MORE MOVIES — Grid with Stagger ═══ */}
      <section ref={moreSectionRef} className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/15 to-[#F0D060]/15 border border-[#D4AF37]/15 shadow-lg shadow-[#D4AF37]/5">
              <Film className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-gradient-cinematic">More Movies</span>
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Browse the full collection
              </p>
            </div>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, idx) => (
                <MovieCardSkeleton key={idx} />
              ))}
            </div>
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
              >
                {gridMovies.map((movie, idx) => (
                  <motion.div
                    key={movie._id || movie.id || `grid-${idx}`}
                    variants={staggerItem}
                  >
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex justify-center mt-12">
                <motion.button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={!canLoadMore}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="ripple-effect inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 via-[#F0D060]/15 to-[#FFEAA7]/15 border border-[#D4AF37]/20 text-gray-200 hover:from-[#D4AF37]/30 hover:via-[#F0D060]/25 hover:to-[#FFEAA7]/20 hover:border-[#D4AF37]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 text-sm font-semibold shadow-lg shadow-black/20"
                >
                  <ChevronDown className="w-4 h-4" />
                  {canLoadMore ? "Load more" : "All loaded"}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-semibold text-gradient">
              CineHub
            </span>
          </div>
          <p className="text-xs text-gray-500">
            AI-powered movie discovery platform
          </p>
        </div>
      </footer>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters || {}}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
