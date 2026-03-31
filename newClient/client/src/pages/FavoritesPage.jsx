import { motion, AnimatePresence } from "framer-motion";
import { Heart, Film, ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { useFavorites } from "@/contexts/FavoritesContext";

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

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0B0F] via-[#0e0e14] to-[#0B0B0F] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <Link href="/">
            <motion.span
              whileHover={{ x: -3 }}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover
            </motion.span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/20 shadow-lg shadow-pink-500/5">
              <Heart className="w-7 h-7 text-pink-400 fill-pink-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="text-gradient-cinematic">My Favorites</span>
              </h1>
              <p className="text-gray-400 mt-1">
                {favorites.length} movie{favorites.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        {favorites.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            <AnimatePresence>
              {favorites.map((movie) => (
                <motion.div
                  key={movie._id || movie.id}
                  variants={staggerItem}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                  layout
                  className="relative group"
                >
                  <MovieCard movie={movie} />
                  {/* Remove button */}
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(movie._id || movie.id);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-500/40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/15 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-pink-500/40" />
            </div>
            <h3 className="text-xl font-bold text-gray-200 mb-2">No favorites yet</h3>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-6">
              Click the ❤️ icon on any movie to add it to your favorites collection.
            </p>
            <Link href="/">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#F0D060]/15 border border-[#D4AF37]/20 text-white font-semibold text-sm hover:from-[#D4AF37]/30 hover:to-[#F0D060]/25 transition-all duration-300 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                Explore Movies
              </motion.span>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
