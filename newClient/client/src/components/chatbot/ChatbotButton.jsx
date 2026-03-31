import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

export default function ChatbotButton({ isOpen, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group"
      style={{
        background: "linear-gradient(135deg, #D4AF37, #F0D060)",
        boxShadow: isOpen
          ? "0 0 20px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.15)"
          : "0 0 15px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1)",
      }}
      aria-label={isOpen ? "Close chat" : "Open AI assistant"}
      id="chatbot-toggle-btn"
    >
      <motion.div
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-[#0B0B0F]" />
        ) : (
          <MessageCircle className="w-6 h-6 text-[#0B0B0F]" />
        )}
      </motion.div>

      {/* Pulse ring when closed */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full animate-chatbot-pulse" />
      )}
    </motion.button>
  );
}
