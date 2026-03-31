import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Trash2, Sparkles, X } from "lucide-react";
import { useChatbot } from "@/hooks/useChatbot";
import { MOOD_BUTTONS } from "@/lib/moodDetector";
import ChatbotButton from "./ChatbotButton";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

export default function ChatbotPanel() {
  const {
    isOpen,
    messages,
    isTyping,
    isListening,
    transcript,
    messagesEndRef,
    toggleChat,
    closeChat,
    sendMessage,
    selectMood,
    surpriseMe,
    startListening,
    stopListening,
    clearHistory,
  } = useChatbot();

  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  // Update input with voice transcript
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <ChatbotButton isOpen={isOpen} onClick={toggleChat} />

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998] sm:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="fixed z-[999] 
                bottom-0 left-0 right-0 h-full
                sm:bottom-24 sm:right-6 sm:left-auto sm:h-[520px] sm:w-[400px]
                sm:rounded-2xl overflow-hidden
                flex flex-col"
              style={{
                background: "rgba(11, 11, 15, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow:
                  "0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
              }}
              id="chatbot-panel"
            >
              {/* ═══ Header ═══ */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F0D060] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                    <Sparkles className="w-4 h-4 text-[#0B0B0F]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">CineBot</h3>
                    <p className="text-[10px] text-[#D4AF37]/60">AI Movie Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={clearHistory}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors sm:hidden"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ═══ Messages Area ═══ */}
              <div className="flex-1 overflow-y-auto px-4 py-3 chatbot-scroll">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))}

                <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* ═══ Mood Quick Buttons ═══ */}
              <div className="px-4 py-2 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 chatbot-mood-scroll">
                  {MOOD_BUTTONS.map((btn) => (
                    <motion.button
                      key={btn.mood}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => selectMood(btn.mood)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 hover:text-[#F0D060] transition-all duration-200"
                    >
                      <span>{btn.emoji}</span>
                      <span>{btn.label}</span>
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={surpriseMe}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gradient-to-r from-[#D4AF37]/10 to-[#F0D060]/10 border border-[#D4AF37]/20 text-[#F0D060] hover:from-[#D4AF37]/20 hover:to-[#F0D060]/20 transition-all duration-200"
                  >
                    <span>🎲</span>
                    <span>Surprise</span>
                  </motion.button>
                </div>
              </div>

              {/* ═══ Input Area ═══ */}
              <div className="px-4 py-3 border-t border-white/[0.06]">
                {/* Voice listening indicator */}
                <AnimatePresence>
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20"
                    >
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.span
                            key={i}
                            className="w-0.5 bg-[#D4AF37] rounded-full"
                            animate={{ height: [8, 20, 8] }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#F0D060]/80 truncate flex-1">
                        {transcript || "Listening..."}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tell me how you feel..."
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-[#D4AF37]/30 focus:bg-white/[0.07] transition-all duration-200"
                    id="chatbot-input"
                  />

                  {/* Mic button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      isListening
                        ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-mic-pulse"
                        : "bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/20"
                    }`}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Send button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-[#0B0B0F] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-200"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
