import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ChevronLeft, ChevronRight, Star, Film } from "lucide-react";
import { api } from "@/lib/api";
import { useCastSearch } from "@/contexts/CastSearchContext";

/**
 * TrendingCast — Horizontal scrollable top actors section.
 * Fetches the most popular cast members from the database.
 * Click an actor → triggers cast search via CastSearchContext.
 */
export default function TrendingCast() {
  const scrollRef = useRef(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const { triggerCastSearch } = useCastSearch();

  useEffect(() => {
    let cancelled = false;
    api.getTopCast(15).then(data => {
      if (!cancelled && Array.isArray(data)) setCast(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  if (loading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F0D060]/20 border border-[#D4AF37]/20">
              <Users className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              <span className="text-gradient-cinematic">Trending Actors</span>
            </h2>
          </div>
          <div className="flex gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="shrink-0 w-28 animate-pulse">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-800/60" />
                <div className="h-3 bg-gray-800/40 rounded mt-3 mx-4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (cast.length === 0) return null;

  // Generate avatar color from name
  const getColor = (name) => {
    const colors = [
      "from-purple-500 to-pink-500",
      "from-cyan-500 to-blue-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-red-500",
      "from-indigo-500 to-violet-500",
      "from-yellow-500 to-amber-500",
    ];
    let hash = 0;
    for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

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
              <Users className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-gradient-cinematic">Trending Actors</span>
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">Most featured stars in the collection</p>
            </div>
          </div>
        </motion.div>

        {/* Scrollable Cards */}
        <div className="relative group">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {cast.map((actor, idx) => (
              <motion.button
                key={actor.name}
                type="button"
                onClick={() => triggerCastSearch(actor.name)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ y: -6, scale: 1.05 }}
                className="shrink-0 w-28 flex flex-col items-center gap-2 group/card cursor-pointer"
              >
                {/* Avatar Circle */}
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getColor(actor.name)} flex items-center justify-center border-2 border-white/10 group-hover/card:border-[#D4AF37]/40 transition-all duration-300 shadow-lg shadow-black/30 group-hover/card:shadow-[#D4AF37]/20`}>
                    <span className="text-xl font-bold text-white">
                      {actor.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  {/* Movie count badge */}
                  <div className="absolute -bottom-1 -right-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 flex items-center gap-0.5">
                    <Film className="w-2.5 h-2.5 text-[#D4AF37]" />
                    <span className="text-[9px] font-bold text-white">{actor.movieCount}</span>
                  </div>
                </div>

                {/* Name */}
                <span className="text-xs font-semibold text-gray-300 group-hover/card:text-white transition-colors text-center leading-tight line-clamp-2">
                  {actor.name}
                </span>

                {/* Rating */}
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-[10px] text-gray-400 font-medium">{actor.avgRating}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Navigation */}
          {cast.length > 6 && (
            <>
              <motion.button
                onClick={() => scroll("left")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -left-3 top-1/3 -translate-y-1/2 z-10 w-9 h-9 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center border border-white/10 hover:border-[#D4AF37]/30"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </motion.button>
              <motion.button
                onClick={() => scroll("right")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -right-3 top-1/3 -translate-y-1/2 z-10 w-9 h-9 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center border border-white/10 hover:border-[#D4AF37]/30"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
