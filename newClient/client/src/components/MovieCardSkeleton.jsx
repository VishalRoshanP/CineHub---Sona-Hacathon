import { motion } from "framer-motion";

export default function MovieCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      {/* Poster skeleton — portrait */}
      <div className="relative aspect-[2/3] bg-gray-800/50 rounded-xl overflow-hidden border border-white/[0.05]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 animate-shimmer-cyan" />
        </div>

        {/* Rating badge skeleton */}
        <div className="absolute top-3 right-3">
          <div className="w-14 h-6 bg-gray-700/50 rounded-lg" />
        </div>
      </div>

      {/* Text skeleton */}
      <div className="mt-3 space-y-2 px-0.5">
        <div className="h-4 bg-gray-800/50 rounded-md w-3/4 overflow-hidden">
          <div className="h-full animate-shimmer-cyan" />
        </div>
        <div className="h-3 bg-gray-800/30 rounded-md w-1/2 overflow-hidden">
          <div className="h-full animate-shimmer-cyan" />
        </div>
      </div>
    </motion.div>
  );
}
