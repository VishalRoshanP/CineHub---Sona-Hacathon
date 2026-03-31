import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import MovieCard from "./MovieCard";
import { getHistory, clearHistory } from "@/hooks/useWatchHistory";

/**
 * WatchHistory — "Continue Watching" horizontal scroll row.
 * Shows recently clicked movies from localStorage.
 */
export default function WatchHistory() {
  const [history, setHistory] = useState(() => getHistory());
  const scrollRef = useRef(null);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (history.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F0D060]/20 border border-[#D4AF37]/20 shadow-lg shadow-[#D4AF37]/5">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-gradient-cinematic">Continue Watching</span>
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Recently explored movies
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleClear}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 transition-all duration-200"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </motion.button>
        </motion.div>

        {/* Scrollable Row */}
        <div className="relative group">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {history.map((movie, idx) => (
                <motion.div
                  key={movie._id || idx}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  className="shrink-0 w-[180px] sm:w-[200px]"
                >
                  <MovieCard movie={movie} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Navigation */}
          {history.length > 4 && (
            <>
              <motion.button
                onClick={() => scroll("left")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -left-3 top-1/3 -translate-y-1/2 z-10 w-11 h-11 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg shadow-black/30 hover:border-[#D4AF37]/30"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </motion.button>
              <motion.button
                onClick={() => scroll("right")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -right-3 top-1/3 -translate-y-1/2 z-10 w-11 h-11 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg shadow-black/30 hover:border-[#D4AF37]/30"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
