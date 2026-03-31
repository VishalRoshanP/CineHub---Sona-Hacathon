import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, Brain } from "lucide-react";
import MovieCard from "./MovieCard";

/* ── Get last search from localStorage ── */
function getLastSearch() {
  try {
    const recent = JSON.parse(localStorage.getItem("cinehub_recent_searches") || "[]");
    return recent[0] || null;
  } catch { return null; }
}

export default function RecommendationSection({ movies = [], title = "Recommended for You" }) {
  const scrollRef = useRef(null);
  const lastSearch = useMemo(() => getLastSearch(), []);

  if (!movies || movies.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F0D060]/20 border border-[#D4AF37]/20 shadow-lg shadow-[#D4AF37]/5">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-gradient-cinematic">{title}</span>
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {lastSearch
                  ? <>Because you searched <span className="text-[#F0D060] font-medium">"{lastSearch}"</span></>
                  : "Based on your search history"
                }
              </p>
            </div>
          </div>

          {/* AI indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/15">
            <Brain className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[10px] font-semibold text-[#D4AF37]/70 uppercase tracking-wider">AI Picks</span>
          </div>
        </motion.div>

        {/* Horizontal Scroll Container */}
        <div className="relative group">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto recommendation-scroll pb-4"
            >
              {movies.map((movie, idx) => (
                <motion.div
                  key={movie._id || movie.id || idx}
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

          {/* Navigation Arrows */}
          {movies.length > 4 && (
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
