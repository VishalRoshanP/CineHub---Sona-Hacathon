import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Clock, Globe, Calendar, Users, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import ThreeBackground from "@/components/ThreeBackground";
import { api } from "@/lib/api";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function MovieDetails() {
  const [, params] = useRoute("/movie/:id");
  const [, setLocation] = useLocation();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [heartPop, setHeartPop] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!params?.id) return;

      setLoading(true);
      try {
        const data = await api.getMovieById(params.id);
        setMovie(data);
      } catch (error) {
        console.error("Error fetching movie:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
        <ThreeBackground />
        <Navbar />
        <div className="pt-32 flex justify-center">
          <Loader />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80 text-white">
        <ThreeBackground />
        <Navbar />
        <div className="pt-32 text-center">
          <p className="text-gray-400 text-lg">Movie not found</p>
          <button
            onClick={() => setLocation("/")}
            className="mt-4 px-4 py-2 bg-linear-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-500 hover:to-pink-500 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const backdropUrl =
    movie.backdrop_url ||
    movie.poster ||
    movie.poster_url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' fill='%23111318'%3E%3Crect width='1200' height='600'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='20'%3ENo Backdrop%3C/text%3E%3C/svg%3E";

  const posterUrl =
    movie.poster ||
    movie.poster_url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";

  const ratingRaw = movie.imdb?.rating ?? movie.rating;
  const rating = ratingRaw ? parseFloat(ratingRaw).toFixed(1) : "N/A";
  const movieId = movie._id || movie.id;
  const isFav = movieId ? isFavorite(movieId) : false;

  const handleFavoriteToggle = () => {
    if (!movie || !movieId) return;
    if (isFav) {
      removeFavorite(movieId);
    } else {
      addFavorite(movie);
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80 text-white overflow-hidden">
      <ThreeBackground />
      <Navbar />

      {/* Backdrop Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-96 overflow-hidden pt-20"
      >
        <motion.img
          src={backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8 }}
          onError={e => {
            e.currentTarget.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' fill='%23111318'%3E%3Crect width='1200' height='600'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='20'%3ENo Backdrop%3C/text%3E%3C/svg%3E";
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black" />

        {/* Back Button */}
        <motion.button
          onClick={() => setLocation("/")}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-24 left-4 sm:left-6 lg:left-8 bg-black/50 backdrop-blur-md hover:bg-black/70 p-2 rounded-full transition duration-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
      </motion.div>

      {/* Content Section */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col md:flex-row gap-8 mb-12"
          >
            {/* Poster */}
            <motion.div
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3 }}
              className="shrink-0 w-full md:w-64"
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-full h-auto object-cover"
                  onError={e => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
              </div>
            </motion.div>

            {/* Movie Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex-1 flex flex-col justify-end pb-4"
            >
              {/* Title */}
              <h1 className="text-4xl sm:text-5xl font-black mb-2 leading-tight">
                {movie.title}
              </h1>

              {/* Year */}
              {movie.year && (
                <p className="text-gray-400 text-lg mb-4">{movie.year}</p>
              )}

              {/* Rating + Favorite */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-lg">
                  <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                  <span className="text-lg font-bold">{rating}</span>
                </div>
                {movie.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-yellow-400 transition text-sm"
                  >
                    IMDb
                  </a>
                )}

                {/* ═══ Favorite Toggle Button ═══ */}
                <motion.button
                  onClick={handleFavoriteToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  className={`relative inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                    isFav
                      ? "bg-pink-500/20 border-2 border-pink-500/40 text-pink-300 hover:bg-pink-500/30 shadow-lg shadow-pink-500/10"
                      : "bg-white/[0.06] border-2 border-white/10 text-white/80 hover:border-pink-500/30 hover:text-pink-300 hover:bg-pink-500/10"
                  }`}
                  id="details-favorite-btn"
                >
                  <motion.div
                    animate={heartPop ? { scale: [1, 1.6, 1], rotate: [0, -20, 20, 0] } : {}}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <Heart
                      className={`w-5 h-5 transition-all duration-300 ${
                        isFav ? "fill-pink-400 text-pink-400" : "text-current"
                      }`}
                    />
                  </motion.div>
                  <span>{isFav ? "Favorited" : "Favorite"}</span>

                  {/* Heart burst particles */}
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
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres.map((genre, idx) => (
                    <motion.span
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm hover:border-purple-500/50 transition"
                    >
                      {genre}
                    </motion.span>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {movie.runtime && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Clock className="w-4 h-4" />
                      Runtime
                    </div>
                    <p className="text-white font-semibold">
                      {movie.runtime} min
                    </p>
                  </motion.div>
                )}

                {(movie.languages?.[0] || movie.language) && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Globe className="w-4 h-4" />
                      Language
                    </div>
                    <p className="text-white font-semibold">
                      {movie.languages?.[0] || movie.language}
                    </p>
                  </motion.div>
                )}

                {movie.released && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Calendar className="w-4 h-4" />
                      Released
                    </div>
                    <p className="text-white font-semibold">
                      {new Date(movie.released).getFullYear()}
                    </p>
                  </motion.div>
                )}

                {movie.countries?.length > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Users className="w-4 h-4" />
                      Country
                    </div>
                    <p className="text-white font-semibold line-clamp-1">
                      {movie.countries.join(", ")}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Plot Section */}
          {movie.fullplot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-4">
                <span className="text-transparent bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text">
                  Plot
                </span>
              </h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                {movie.fullplot}
              </p>
            </motion.div>
          )}

          {/* Cast Section */}
          {movie.cast && movie.cast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-6">
                <span className="text-transparent bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text">
                  Cast
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {movie.cast.slice(0, 10).map((actor, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/30 transition text-center"
                  >
                    <p className="text-white font-semibold text-sm line-clamp-2">
                      {actor}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Additional Info */}
          {(movie.country || movie.type) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
            >
              {movie.country && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-2">Country</h3>
                  <p className="text-white font-semibold">{movie.country}</p>
                </div>
              )}
              {movie.type && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-2">Type</h3>
                  <p className="text-white font-semibold capitalize">
                    {movie.type}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer Spacing */}
      <div className="h-12" />
    </div>
  );
}
