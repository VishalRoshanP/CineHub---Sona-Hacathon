import { motion } from "framer-motion";

export default function Loader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-12 h-12">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-1 bg-[#0B0F14] rounded-full" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full opacity-0"
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    </div>
  );
}
