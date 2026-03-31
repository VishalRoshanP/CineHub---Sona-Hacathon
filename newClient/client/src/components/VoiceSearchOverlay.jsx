import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, RotateCcw, Zap } from "lucide-react";

/* ── Ripple Ring Component ── */
function RippleRings({ active }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-[#D4AF37]/30"
          initial={{ width: 80, height: 80, opacity: 0.6 }}
          animate={{
            width: [80, 200 + i * 40],
            height: [80, 200 + i * 40],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeOut",
          }}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </>
  );
}

/* ── Floating Audio Bars ── */
function AudioBars({ active }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-1 h-8">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-[#D4AF37] to-[#F0D060]"
          animate={{
            height: [8, 16 + Math.random() * 20, 8],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 30,
    transition: { duration: 0.2 },
  },
};

export default function VoiceSearchOverlay({
  isOpen,
  onClose,
  listening,
  voiceStatus,
  voiceText,
  startListening,
  stopListening,
  isContinuous,
  toggleContinuous,
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleRetry = useCallback(() => {
    if (stopListening) stopListening();
    setTimeout(() => startListening(), 200);
  }, [startListening, stopListening]);

  const handleCancel = useCallback(() => {
    if (stopListening) stopListening();
    onClose();
  }, [stopListening, onClose]);

  const getStatusText = () => {
    switch (voiceStatus) {
      case "listening":
        return isContinuous ? "Jarvis Mode — Listening..." : "Listening...";
      case "result":
        return `You said: "${voiceText}"`;
      case "searching":
        return `Searching for "${voiceText}"...`;
      case "error":
        return voiceText || "Could not recognize. Try again.";
      default:
        return "Tap the microphone to start";
    }
  };

  const getStatusIcon = () => {
    if (voiceStatus === "error") return "❌";
    if (voiceStatus === "result") return "✅";
    if (voiceStatus === "searching") return "🔍";
    if (voiceStatus === "listening") return "🎙️";
    return "🎤";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="voice-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{
            background: "radial-gradient(ellipse at center, rgba(11,11,15,0.97) 0%, rgba(0,0,0,0.99) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Close button */}
          <motion.button
            onClick={handleCancel}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/[0.06] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Main content */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center gap-8 px-6"
          >
            {/* Brand label */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#D4AF37]/60">
                CineHub Voice
              </span>
            </motion.div>

            {/* Mic button with ripples */}
            <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
              <RippleRings active={listening} />

              {/* Ambient glow */}
              <motion.div
                className="absolute rounded-full"
                style={{ width: 120, height: 120 }}
                animate={{
                  boxShadow: listening
                    ? [
                        "0 0 30px rgba(212,175,55,0.3), 0 0 60px rgba(212,175,55,0.15)",
                        "0 0 50px rgba(212,175,55,0.5), 0 0 100px rgba(240,208,96,0.25)",
                        "0 0 30px rgba(212,175,55,0.3), 0 0 60px rgba(212,175,55,0.15)",
                      ]
                    : "0 0 15px rgba(212,175,55,0.1), 0 0 30px rgba(212,175,55,0.05)",
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Main mic button */}
              <motion.button
                type="button"
                onClick={listening ? stopListening : startListening}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  listening
                    ? "bg-gradient-to-br from-[#D4AF37] to-[#B8941E] border-[#F0D060]/50 shadow-[0_0_40px_rgba(212,175,55,0.4)]"
                    : voiceStatus === "error"
                    ? "bg-red-500/20 border-red-500/30 hover:border-red-400/50"
                    : "bg-white/[0.08] border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                }`}
              >
                {listening ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className={`w-10 h-10 ${voiceStatus === "error" ? "text-red-400" : "text-[#D4AF37]"}`} />
                )}
              </motion.button>
            </div>

            {/* Audio visualization bars */}
            <AudioBars active={listening} />

            {/* Status text */}
            <motion.div
              key={voiceStatus}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center max-w-sm"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg">{getStatusIcon()}</span>
              </div>
              <p className={`text-base font-medium leading-relaxed ${
                voiceStatus === "error"
                  ? "text-red-400/90"
                  : voiceStatus === "searching"
                  ? "text-[#F0D060]"
                  : voiceStatus === "result"
                  ? "text-gray-200"
                  : listening
                  ? "text-[#D4AF37] animate-pulse"
                  : "text-gray-400"
              }`}>
                {getStatusText()}
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3"
            >
              {/* Retry button */}
              {(voiceStatus === "error" || voiceStatus === "result") && (
                <motion.button
                  type="button"
                  onClick={handleRetry}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 text-sm font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </motion.button>
              )}

              {/* Continuous mode toggle */}
              {toggleContinuous && (
                <motion.button
                  type="button"
                  onClick={toggleContinuous}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all border ${
                    isContinuous
                      ? "bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#F0D060]"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Zap className={`w-4 h-4 ${isContinuous ? "text-[#F0D060]" : ""}`} />
                  {isContinuous ? "Jarvis ON" : "Jarvis Mode"}
                </motion.button>
              )}
            </motion.div>

            {/* Hint text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.6 }}
              className="text-[11px] text-gray-500 text-center"
            >
              Press <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/10 rounded text-[10px] font-mono mx-0.5">ESC</kbd> to close
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
