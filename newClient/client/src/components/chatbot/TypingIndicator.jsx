import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex justify-start mb-3"
    >
      <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-[#D4AF37]/60"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-white/30 ml-1">
            Analyzing your mood…
          </span>
        </div>
      </div>
    </motion.div>
  );
}
