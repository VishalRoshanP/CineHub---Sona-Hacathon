import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Clock, Globe, Calendar, Users, Award, Film, ExternalLink, Sparkles, Heart } from "lucide-react";
import { useMovieModal } from "@/contexts/MovieModalContext";
import { useCastSearch } from "@/contexts/CastSearchContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import Loader from "./Loader";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 280 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 40,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

function StarRating({ rating }) {
  const numRating = parseFloat(rating) || 0;
  const stars = Math.round(numRating / 2);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= stars
              ? "fill-yellow-400 text-yellow-400"
              : "fill-transparent text-gray-500"
          }`}
        />
      ))}
    </div>
  );
}

function GenreBadge({ genre }) {
  return (
    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#F0D060]/20 border border-[#D4AF37]/25 text-[#F0D060] hover:border-[#D4AF37]/40 transition">
      {genre}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-[#D4AF37]/25 transition group/stat">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1 group-hover/stat:text-[#D4AF37]/80 transition-colors">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  );
}

/* ── AI Explanation Generator ── */
function generateAIExplanation(movie) {
  if (!movie) return null;
  const reasons = [];
  if (movie.genres && movie.genres.length > 0) {
    reasons.push(`Matches ${movie.genres.slice(0, 2).join(" & ")} genre`);
  }
  const rating = movie?.imdb?.rating ?? movie?.rating;
  if (rating && parseFloat(rating) >= 7.5) {
    reasons.push("Highly rated by audiences");
  }
  if (movie.awards?.text) {
    reasons.push("Award-winning film");
  }
  if (movie.plot || movie.fullplot) {
    const plot = (movie.fullplot || movie.plot).toLowerCase();
    const themes = ["adventure", "love", "war", "mystery", "thriller", "sci-fi", "comedy", "drama", "action", "hero"];
    const matchedThemes = themes.filter(t => plot.includes(t));
    if (matchedThemes.length > 0) {
      reasons.push(`Contains ${matchedThemes[0]} themes`);
    }
  }
  if (reasons.length === 0) reasons.push("Matches your search criteria");
  return reasons;
}

export default function MovieDetailModal() {
  const { isModalOpen, selectedMovie, modalLoading, closeModal } =
    useMovieModal();
  const { triggerCastSearch } = useCastSearch();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [heartPop, setHeartPop] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  }, [isModalOpen, closeModal]);

  const movie = selectedMovie;

  const posterUrl =
    movie?.poster ||
    movie?.poster_url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";

  const backdropUrl =
    movie?.backdrop_url ||
    movie?.poster ||
    movie?.poster_url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' fill='%23111318'%3E%3Crect width='1200' height='600'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='20'%3ENo Backdrop%3C/text%3E%3C/svg%3E";

  const ratingRaw = movie?.imdb?.rating ?? movie?.rating;
  const rating = ratingRaw ? parseFloat(ratingRaw).toFixed(1) : "N/A";
  const votes = movie?.imdb?.votes;
  const aiReasons = generateAIExplanation(movie);
  const movieId = movie?._id || movie?.id;
  const isFav = movieId ? isFavorite(movieId) : false;

  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    if (!movie || !movieId) return;
    if (isFav) {
      removeFavorite(movieId);
    } else {
      addFavorite(movie);
      // Trigger heart pop animation
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 600);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isModalOpen && (
        <motion.div
          key="movie-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
          onClick={closeModal}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.80)", backdropFilter: "blur(16px)" }}
        >
          <motion.div
            key="movie-modal-content"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden movie-modal-glass"
          >
            {/* Close Button */}
            <motion.button
              onClick={closeModal}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-md hover:bg-black/70 p-2.5 rounded-full transition duration-300 border border-white/10 hover:border-white/20"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[90vh] movie-modal-scroll">
              {modalLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader />
                </div>
              ) : movie ? (
                <>
                  {/* Backdrop Banner — cinematic parallax zoom */}
                  <div className="relative h-56 sm:h-72 overflow-hidden">
                    <motion.img
                      src={backdropUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      initial={{ scale: 1.15 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' fill='%23111318'%3E%3Crect width='1200' height='600'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='20'%3ENo Backdrop%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#0B0B0F]" />
                    {/* Cinematic gradient accent on top — gold */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F0D060] to-[#FFEAA7] opacity-60" />
                  </div>

                  {/* Main Content */}
                  <div className="relative -mt-20 px-4 sm:px-6 pb-6">
                    {/* Poster + Title + Rating */}
                    <div className="flex flex-col sm:flex-row gap-5 mb-6">
                      {/* Poster */}
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="shrink-0 w-32 sm:w-40"
                      >
                        <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 group/poster">
                          <img
                            src={posterUrl}
                            alt={movie.title}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover/poster:scale-105"
                            onError={(e) => {
                              e.currentTarget.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          {/* Poster glow on parent hover */}
                          <div className="absolute inset-0 rounded-xl ring-1 ring-white/[0.08] group-hover/poster:ring-[#D4AF37]/20 transition-all duration-300" />
                        </div>
                      </motion.div>

                      {/* Title + Meta */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex-1 flex flex-col justify-end pt-16 sm:pt-0"
                      >
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 leading-tight">
                          {movie.title}
                        </h2>

                        {movie.year && (
                          <p className="text-gray-400 text-sm mb-3">
                            {movie.year}
                            {movie.rated && ` • ${movie.rated}`}
                            {movie.type && (
                              <span className="capitalize"> • {movie.type}</span>
                            )}
                          </p>
                        )}

                        {/* Rating */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#B8941E] px-3 py-1.5 rounded-lg shadow-lg shadow-[#D4AF37]/15">
                            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                            <span className="text-sm font-bold text-white">
                              {rating}
                            </span>
                          </div>
                          <StarRating rating={ratingRaw} />
                          {votes && (
                            <span className="text-xs text-gray-400">
                              ({votes.toLocaleString()} votes)
                            </span>
                          )}
                        </div>

                        {/* Genres */}
                        {movie.genres && movie.genres.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {movie.genres.map((genre, idx) => (
                              <GenreBadge key={idx} genre={genre} />
                            ))}
                          </div>
                        )}

                        {/* ═══ Favorite Button ═══ */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 }}
                          className="mt-4"
                        >
                          <motion.button
                            onClick={handleFavoriteToggle}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                              isFav
                                ? "bg-pink-500/20 border-2 border-pink-500/40 text-pink-300 hover:bg-pink-500/30 shadow-lg shadow-pink-500/10"
                                : "bg-white/[0.06] border-2 border-white/10 text-white/80 hover:border-pink-500/30 hover:text-pink-300 hover:bg-pink-500/10"
                            }`}
                            id="modal-favorite-btn"
                          >
                            <motion.div
                              animate={heartPop ? { scale: [1, 1.5, 1], rotate: [0, -15, 15, 0] } : {}}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                              <Heart
                                className={`w-5 h-5 transition-all duration-300 ${
                                  isFav ? "fill-pink-400 text-pink-400" : "text-current"
                                }`}
                              />
                            </motion.div>
                            <span>{isFav ? "Remove from Favorites" : "Add to Favorites"}</span>

                            {/* Heart burst particles on add */}
                            <AnimatePresence>
                              {heartPop && (
                                <>
                                  {[...Array(6)].map((_, i) => (
                                    <motion.span
                                      key={i}
                                      initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                                      animate={{
                                        opacity: 0,
                                        scale: 0,
                                        x: (Math.random() - 0.5) * 60,
                                        y: (Math.random() - 0.5) * 50 - 15,
                                      }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.6, ease: "easeOut" }}
                                      className="absolute text-pink-400 pointer-events-none"
                                      style={{ left: "18px", top: "50%" }}
                                    >
                                      ❤️
                                    </motion.span>
                                  ))}
                                </>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Quick Stats Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                    >
                      <StatCard
                        icon={Clock}
                        label="Runtime"
                        value={movie.runtime ? `${movie.runtime} min` : null}
                      />
                      <StatCard
                        icon={Globe}
                        label="Language"
                        value={
                          movie.languages?.[0] || movie.language || null
                        }
                      />
                      <StatCard
                        icon={Calendar}
                        label="Released"
                        value={
                          movie.released
                            ? new Date(movie.released).toLocaleDateString(
                                "en-US",
                                { year: "numeric", month: "short", day: "numeric" }
                              )
                            : null
                        }
                      />
                      <StatCard
                        icon={Users}
                        label="Country"
                        value={
                          movie.countries?.length > 0
                            ? movie.countries.join(", ")
                            : null
                        }
                      />
                    </motion.div>

                    {/* AI Explanation — "Why this result?" */}
                    {aiReasons && aiReasons.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.32 }}
                        className="mb-6"
                      >
                        <div className="bg-gradient-to-r from-[#D4AF37]/10 to-[#F0D060]/5 border border-[#D4AF37]/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                            <h3 className="text-sm font-bold text-[#F0D060]">
                              Why this result?
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/15 text-gray-300 font-medium"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Overview / Plot */}
                    {(movie.fullplot || movie.plot) && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mb-6"
                      >
                        <h3 className="text-lg font-bold mb-2">
                          <span className="text-gradient-cinematic">
                            Overview
                          </span>
                        </h3>
                        <p className="text-gray-300 leading-relaxed text-sm">
                          {movie.fullplot || movie.plot}
                        </p>
                      </motion.div>
                    )}

                    {/* Directors */}
                    {movie.directors && movie.directors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38 }}
                        className="mb-6"
                      >
                        <h3 className="text-lg font-bold mb-2">
                          <span className="text-gradient-cinematic">
                            Director{movie.directors.length > 1 ? "s" : ""}
                          </span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {movie.directors.map((dir, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:border-[#D4AF37]/25 transition"
                            >
                              🎬 {dir}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Cast */}
                    {movie.cast && movie.cast.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.42 }}
                        className="mb-6"
                      >
                        <h3 className="text-lg font-bold mb-3">
                          <span className="text-gradient-cinematic">
                            Cast
                          </span>
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 movie-modal-scroll-x">
                          {movie.cast.slice(0, 10).map((actor, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.42 + idx * 0.04 }}
                              whileHover={{ y: -4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                closeModal();
                                triggerCastSearch(actor);
                              }}
                              className="shrink-0 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-[#D4AF37]/25 transition text-center min-w-[100px] group/actor cursor-pointer"
                            >
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#F0D060]/30 mx-auto mb-2 flex items-center justify-center border border-white/10 group-hover/actor:border-[#D4AF37]/25 transition">
                                <span className="text-sm font-bold text-[#F0D060]">
                                  {actor.split(" ").map(w => w[0]).join("").slice(0, 2)}
                                </span>
                              </div>
                              <p className="text-white font-semibold text-xs line-clamp-2 group-hover/actor:text-[#F0D060] transition-colors">
                                {actor}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5">Click to search</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Writers */}
                    {movie.writers && movie.writers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.46 }}
                        className="mb-6"
                      >
                        <h3 className="text-lg font-bold mb-2">
                          <span className="text-gradient-cinematic">
                            Writers
                          </span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {movie.writers.slice(0, 5).map((w, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:border-[#D4AF37]/25 transition"
                            >
                              ✍️ {w}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Awards */}
                    {movie.awards?.text && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mb-6"
                      >
                        <div className="bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-yellow-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-sm font-bold text-yellow-300">
                              Awards
                            </h3>
                          </div>
                          <p className="text-gray-300 text-sm">
                            {movie.awards.text}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Extra Details Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.54 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
                    >
                      {movie.languages && movie.languages.length > 1 && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-[#D4AF37]/20 transition">
                          <h4 className="text-gray-400 text-xs mb-1">
                            All Languages
                          </h4>
                          <p className="text-white text-sm font-medium">
                            {movie.languages.join(", ")}
                          </p>
                        </div>
                      )}

                      {movie.tomatoes?.viewer?.rating && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-[#D4AF37]/20 transition">
                          <h4 className="text-gray-400 text-xs mb-1">
                            🍅 Viewer Rating
                          </h4>
                          <p className="text-white text-sm font-medium">
                            {movie.tomatoes.viewer.rating} / 5
                            {movie.tomatoes.viewer.numReviews &&
                              ` (${movie.tomatoes.viewer.numReviews.toLocaleString()} reviews)`}
                          </p>
                        </div>
                      )}

                      {movie.tomatoes?.critic?.rating && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-[#D4AF37]/20 transition">
                          <h4 className="text-gray-400 text-xs mb-1">
                            🍅 Critic Rating
                          </h4>
                          <p className="text-white text-sm font-medium">
                            {movie.tomatoes.critic.rating} / 10
                            {movie.tomatoes.critic.numReviews &&
                              ` (${movie.tomatoes.critic.numReviews} reviews)`}
                          </p>
                        </div>
                      )}

                      {movie.num_mflix_comments > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-[#D4AF37]/20 transition">
                          <h4 className="text-gray-400 text-xs mb-1">
                            💬 Comments
                          </h4>
                          <p className="text-white text-sm font-medium">
                            {movie.num_mflix_comments} comments
                          </p>
                        </div>
                      )}
                    </motion.div>

                    {/* External Links */}
                    {(movie.imdb_id || movie.tomatoes?.website) && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.58 }}
                        className="flex flex-wrap gap-3"
                      >
                        {movie.imdb_id && (
                          <a
                            href={`https://www.imdb.com/title/${movie.imdb_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ripple-effect inline-flex items-center gap-2 px-4 py-2 bg-yellow-600/10 border border-yellow-500/20 rounded-lg text-yellow-300 text-sm hover:bg-yellow-600/20 hover:border-yellow-500/30 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on IMDb
                          </a>
                        )}
                        {movie.tomatoes?.website && (
                          <a
                            href={movie.tomatoes.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ripple-effect inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-[#F0D060] text-sm hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/30 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Official Website
                          </a>
                        )}
                      </motion.div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center min-h-[300px]">
                  <p className="text-gray-400">Movie not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
