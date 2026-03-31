import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, Star, ChevronDown, Globe, ArrowUpDown } from "lucide-react";

const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Biography", "Comedy",
  "Crime", "Documentary", "Drama", "Family", "Fantasy",
  "History", "Horror", "Music", "Mystery", "Romance",
  "Sci-Fi", "Sport", "Thriller", "War", "Western",
];

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Italian",
  "Japanese", "Korean", "Chinese", "Hindi", "Portuguese",
  "Russian", "Arabic", "Swedish", "Dutch", "Turkish",
];

const SORT_OPTIONS = [
  { id: "popularity", label: "Popularity", icon: "🔥" },
  { id: "rating", label: "Rating", icon: "⭐" },
  { id: "latest", label: "Latest", icon: "🕐" },
  { id: "title", label: "Title A-Z", icon: "🔤" },
];

const YEAR_RANGE = { min: 1920, max: 2025 };
const RATING_RANGE = { min: 0, max: 10 };

export default function FilterPanel({ isOpen, onClose, filters, onFilterChange }) {
  const [selectedGenres, setSelectedGenres] = useState(filters?.genres || []);
  const [yearMin, setYearMin] = useState(filters?.yearMin || YEAR_RANGE.min);
  const [yearMax, setYearMax] = useState(filters?.yearMax || YEAR_RANGE.max);
  const [ratingMin, setRatingMin] = useState(filters?.ratingMin || RATING_RANGE.min);
  const [selectedLanguage, setSelectedLanguage] = useState(filters?.language || "");
  const [sortBy, setSortBy] = useState(filters?.sortBy || "popularity");

  // Sync local state when filters prop changes
  useEffect(() => {
    if (filters) {
      setSelectedGenres(filters.genres || []);
      setYearMin(filters.yearMin || YEAR_RANGE.min);
      setYearMax(filters.yearMax || YEAR_RANGE.max);
      setRatingMin(filters.ratingMin || RATING_RANGE.min);
      setSelectedLanguage(filters.language || "");
      setSortBy(filters.sortBy || "popularity");
    }
  }, [isOpen]);

  const toggleGenre = useCallback((genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }, []);

  const handleApply = () => {
    onFilterChange({
      genres: selectedGenres,
      yearMin,
      yearMax,
      ratingMin,
      language: selectedLanguage,
      sortBy,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedGenres([]);
    setYearMin(YEAR_RANGE.min);
    setYearMax(YEAR_RANGE.max);
    setRatingMin(RATING_RANGE.min);
    setSelectedLanguage("");
    setSortBy("popularity");
    onFilterChange({
      genres: [],
      yearMin: YEAR_RANGE.min,
      yearMax: YEAR_RANGE.max,
      ratingMin: RATING_RANGE.min,
      language: "",
      sortBy: "popularity",
    });
  };

  const hasFilters = selectedGenres.length > 0 || yearMin > YEAR_RANGE.min || yearMax < YEAR_RANGE.max || ratingMin > RATING_RANGE.min || selectedLanguage || sortBy !== "popularity";

  const activeCount = useMemo(() => {
    let count = 0;
    if (selectedGenres.length > 0) count++;
    if (yearMin > YEAR_RANGE.min || yearMax < YEAR_RANGE.max) count++;
    if (ratingMin > RATING_RANGE.min) count++;
    if (selectedLanguage) count++;
    if (sortBy !== "popularity") count++;
    return count;
  }, [selectedGenres, yearMin, yearMax, ratingMin, selectedLanguage, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-sm bg-[#0B0B0F]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Filters</h2>
                  {activeCount > 0 && (
                    <span className="text-[10px] text-[#F0D060] font-medium">
                      {activeCount} active filter{activeCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/[0.06] hover:bg-white/10 transition-colors border border-white/[0.08]"
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            </div>

            <div className="px-6 py-6 space-y-8">
              {/* Sort By */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Sort By</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSortBy(opt.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl border transition-all duration-200 ${
                        sortBy === opt.id
                          ? "bg-[#D4AF37]/15 border-[#D4AF37]/35 text-[#F0D060] shadow-sm shadow-[#D4AF37]/10"
                          : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/15"
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Genre</h3>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <motion.button
                      key={genre}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                        selectedGenres.includes(genre)
                          ? "bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#F0D060]"
                          : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {genre}
                    </motion.button>
                  ))}
                </div>
                {selectedGenres.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 flex flex-wrap gap-1.5"
                  >
                    {selectedGenres.map(g => (
                      <span
                        key={g}
                        onClick={() => toggleGenre(g)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#F0D060] cursor-pointer hover:bg-[#D4AF37]/20 transition-colors"
                      >
                        {g}
                        <X className="w-2.5 h-2.5" />
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Language Filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Language</h3>
                </div>
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl text-sm text-gray-300 px-4 py-2.5 appearance-none outline-none focus:border-[#D4AF37]/30 transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#121217]">All Languages</option>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <option key={lang} value={lang} className="bg-[#121217]">{lang}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Year Range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Year Range</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-gray-500 mb-1 block">From</label>
                      <input
                        type="range"
                        min={YEAR_RANGE.min}
                        max={YEAR_RANGE.max}
                        value={yearMin}
                        onChange={e => setYearMin(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-xs text-[#F0D060] font-mono mt-1 block">{yearMin}</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                      <input
                        type="range"
                        min={YEAR_RANGE.min}
                        max={YEAR_RANGE.max}
                        value={yearMax}
                        onChange={e => setYearMax(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-xs text-[#F0D060] font-mono mt-1 block">{yearMax}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Minimum */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Minimum Rating</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={RATING_RANGE.min}
                    max={RATING_RANGE.max}
                    step={0.5}
                    value={ratingMin}
                    onChange={e => setRatingMin(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none accent-[#D4AF37] cursor-pointer"
                  />
                  <div className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-lg border border-white/[0.08] min-w-[48px] justify-center">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-bold text-white">{ratingMin}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-[#0B0B0F]/90 backdrop-blur-xl border-t border-white/[0.06] px-6 py-4 flex items-center gap-3">
              <motion.button
                type="button"
                onClick={handleReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!hasFilters}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Reset
              </motion.button>
              <motion.button
                type="button"
                onClick={handleApply}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#D4AF37] to-[#B8941E] text-white shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 transition-all duration-200"
              >
                Apply Filters
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
