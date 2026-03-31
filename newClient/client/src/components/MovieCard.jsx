import { useState } from "react";
import { Star, Play, Clock, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useMovieModal } from "@/contexts/MovieModalContext";
import { usePrefetchMovie } from "@/hooks/useMovieQueries";
import { useFavorites } from "@/contexts/FavoritesContext";
import { addToHistory } from "@/hooks/useWatchHistory";

export default function MovieCard({ movie }) {
  const { openModal } = useMovieModal();
  const prefetchMovie = usePrefetchMovie();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const isFav = isFavorite(movie?._id || movie?.id);
  const [imgLoaded, setImgLoaded] = useState(false);
  const id = movie?._id || movie?.id;
  const posterUrl =
    movie?.poster ||
    movie?.poster_url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";
  const ratingVal = movie?.imdb?.rating ?? movie?.rating;
  const rating = ratingVal ? parseFloat(ratingVal).toFixed(1) : null;
  const year = movie?.year || "N/A";
  const runtime = movie?.runtime;

  return (
    <div
      onClick={() => {
        addToHistory(movie);
        openModal(id);
      }}
      onMouseEnter={() => prefetchMovie(id)}
      className="group block cursor-pointer"
    >
      <motion.div
        whileHover={{ y: -10, scale: 1.05 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl"
      >
        {/* Poster Image — Portrait */}
        <div className="relative aspect-[2/3] bg-gray-900/60 overflow-hidden rounded-xl border border-white/[0.1] group-hover:border-[#D4AF37]/35 transition-all duration-400 shadow-md shadow-black/30 group-hover:shadow-2xl group-hover:shadow-[#D4AF37]/10 card-cinematic-hover">
          {/* Skeleton placeholder while loading */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gray-800/50 overflow-hidden">
              <div className="absolute inset-0 animate-shimmer-cyan" />
            </div>
          )}
          <img
            src={posterUrl}
            alt={movie?.title || "Movie"}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onError={e => {
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' fill='%23111318'%3E%3Crect width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='16'%3ENo Poster%3C/text%3E%3C/svg%3E";
              setImgLoaded(true);
            }}
          />

          {/* Always-visible Rating Badge */}
          {rating && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1 border border-[#D4AF37]/25 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold text-white">{rating}</span>
              </div>
            </div>
          )}

          {/* Favorite Button — appears on hover */}
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.2 }}
            onClick={(e) => {
              e.stopPropagation();
              if (isFav) removeFavorite(id);
              else addFavorite(movie);
            }}
            className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 border opacity-0 group-hover:opacity-100 ${
              isFav
                ? "bg-pink-500/30 border-pink-500/40 text-pink-400"
                : "bg-black/50 border-white/10 text-white/70 hover:text-pink-400 hover:border-pink-500/30"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-pink-400" : ""}`} />
          </motion.button>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col justify-end p-4">
            {/* Title on overlay */}
            <h3 className="text-base font-bold text-white leading-tight mb-1 line-clamp-2">
              {movie?.title}
            </h3>

            {/* Meta row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-300">{year}</span>
              {runtime && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {runtime}m
                  </span>
                </>
              )}
            </div>

            {/* Genre chips on hover */}
            {movie?.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {movie.genres.slice(0, 3).map((genre, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#F0D060]/15 border border-[#D4AF37]/30 text-[#F0D060] font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* View Details */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="ripple-effect flex items-center gap-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#F0D060]/15 backdrop-blur-md px-3 py-2 rounded-lg w-fit hover:from-[#D4AF37]/30 hover:to-[#F0D060]/25 transition-all duration-200 border border-[#D4AF37]/25"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              <span className="text-xs font-semibold text-white">
                View Details
              </span>
            </motion.div>
          </div>

          {/* Hover glow ring */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-white/[0.08] group-hover:ring-[#D4AF37]/30 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-400 pointer-events-none" />
        </div>

        {/* Title and Year — below card */}
        <div className="mt-3 space-y-0.5 px-0.5">
          <h3 className="text-sm font-bold text-white/95 line-clamp-1 group-hover:text-gradient transition duration-300">
            {movie?.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{year}</span>
            {movie?.genres?.[0] && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">{movie.genres[0]}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
