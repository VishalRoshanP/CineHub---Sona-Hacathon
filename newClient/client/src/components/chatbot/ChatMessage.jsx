import { motion } from "framer-motion";
import { Star } from "lucide-react";

function MovieSuggestionCard({ movie }) {
  const poster = movie.poster || movie.poster_url || movie.image;
  const title = movie.title || "Untitled";
  const rating = movie?.imdb?.rating ?? movie?.rating ?? null;
  const year = movie.year || "";
  const genres = movie.genres || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-[#D4AF37]/30 transition-all duration-200 cursor-pointer group"
    >
      {/* Poster */}
      <div className="w-12 h-[72px] flex-shrink-0 rounded-md overflow-hidden bg-white/5">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <p className="text-sm font-medium text-white/90 truncate leading-tight">
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {rating && (
            <span className="flex items-center gap-0.5 text-xs text-[#F0D060]">
              <Star className="w-3 h-3 fill-[#F0D060] text-[#F0D060]" />
              {parseFloat(rating).toFixed(1)}
            </span>
          )}
          {year && (
            <span className="text-[10px] text-white/40">{year}</span>
          )}
        </div>
        {/* Genre badges */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {genres.slice(0, 3).map((g, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#F0D060]/70 border border-[#D4AF37]/15"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatMessage({ message }) {
  const isBot = message.role === "bot";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isBot ? "justify-start" : "justify-end"} mb-3`}
    >
      <div
        className={`max-w-[85%] ${
          isBot
            ? "bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-bl-md"
            : "bg-gradient-to-r from-[#D4AF37]/20 to-[#F0D060]/15 border border-[#D4AF37]/20 rounded-2xl rounded-br-md"
        } px-4 py-3`}
      >
        {/* Text */}
        <p
          className={`text-sm leading-relaxed whitespace-pre-line ${
            isBot ? "text-white/80" : "text-white/90"
          }`}
        >
          {message.text}
        </p>

        {/* Movie suggestions */}
        {isBot && message.movies && message.movies.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.movies.map((movie, idx) => (
              <MovieSuggestionCard
                key={movie._id || movie.id || idx}
                movie={movie}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-white/20 mt-1.5 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
