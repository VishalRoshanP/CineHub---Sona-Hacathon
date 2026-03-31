/**
 * useChatbot — Custom hook for CineHub AI Chatbot
 *
 * Manages chat state, mood detection, API calls, voice input,
 * follow-ups, "Surprise Me", and localStorage persistence.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import {
  detectMood,
  detectMoodByEmoji,
  detectFollowUp,
  getSurpriseCategory,
  WELCOME_MESSAGE,
} from "@/lib/moodDetector";

const STORAGE_KEY = "cinehub-chat-history";
const MAX_HISTORY = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [{ ...WELCOME_MESSAGE, timestamp: Date.now() }];
}

function saveHistory(messages) {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function useChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [isTyping, setIsTyping] = useState(false);
  const [lastMood, setLastMood] = useState(null);
  const messagesEndRef = useRef(null);
  const processingRef = useRef(false);

  // ─── Voice state ───
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Persist on every message change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // ─── Add a message ───
  const addMessage = useCallback(
    (msg) => {
      setMessages((prev) => {
        // Prevent duplicate bot messages
        const last = prev[prev.length - 1];
        if (last && last.role === msg.role && last.text === msg.text) {
          return prev;
        }
        return [...prev, { ...msg, timestamp: Date.now() }];
      });
      scrollToBottom();
    },
    [scrollToBottom]
  );

  // ─── Core: process user input ───
  const processMessage = useCallback(
    async (text, moodOverride = null) => {
      if (processingRef.current) return;
      processingRef.current = true;

      // Add user message
      addMessage({ role: "user", text, movies: [] });

      setIsTyping(true);

      try {
        // Check for follow-up first (client-side only)
        if (!moodOverride) {
          const followUp = detectFollowUp(text);
          if (followUp && lastMood) {
            if (followUp.type === "liked" || followUp.type === "more" || followUp.type === "affirm") {
              // Re-send last mood to get different results
              moodOverride = detectMoodByEmoji(lastMood.mood) || lastMood;
            } else if (followUp.type === "different") {
              addMessage({
                role: "bot",
                text: "No worries! Tell me what mood you're in, or try one of the quick buttons below. 👇",
                movies: [],
              });
              setIsTyping(false);
              processingRef.current = false;
              return;
            }
          }
        }

        // Determine the message to send to the backend
        let messageToSend = text;
        if (moodOverride && moodOverride.mood) {
          // For mood button clicks and follow-ups, send the mood name for clear intent
          messageToSend = moodOverride.mood === "surprise"
            ? moodOverride.searchQuery  // surprise: send the random search query
            : text;                      // mood buttons: the text already contains mood keywords
        }

        // ── Call the backend chat API ──
        // Backend handles: intent detection → MongoDB genre query → returns { reply, movies }
        const chatResponse = await api.chatByMessage(messageToSend);

        console.log("🤖 Chat API response:", chatResponse);

        const reply = chatResponse.reply || "Here are some movies for you!";
        const movies = Array.isArray(chatResponse.movies) ? chatResponse.movies : [];

        // Save mood for follow-up detection
        const detectedMood = moodOverride || detectMood(text);
        if (detectedMood) {
          setLastMood(detectedMood);
        }

        // Add bot response with movies
        addMessage({
          role: "bot",
          text: reply,
          movies: movies.slice(0, 6),
        });

        // After showing results, ask follow-up
        if (movies.length > 0) {
          setTimeout(() => {
            addMessage({
              role: "bot",
              text: "Want more like this? Or tell me a different mood! 😊",
              movies: [],
            });
          }, 1200);
        }
      } catch (err) {
        console.error("Chatbot error:", err);
        addMessage({
          role: "bot",
          text: "Oops! Something went wrong. Please try again.",
          movies: [],
        });
      } finally {
        setIsTyping(false);
        processingRef.current = false;
      }
    },
    [addMessage, lastMood]
  );

  // ─── Send text message ───
  const sendMessage = useCallback(
    (text) => {
      if (!text || text.trim().length === 0) return;
      processMessage(text.trim());
    },
    [processMessage]
  );

  // ─── Mood button click ───
  const selectMood = useCallback(
    (moodName) => {
      const moodResult = detectMoodByEmoji(moodName);
      if (moodResult) {
        const labelMap = {
          happy: "I'm feeling happy! 😊",
          sad: "I'm feeling sad 😢",
          angry: "I'm feeling angry 😡",
          romantic: "I'm in a romantic mood 😍",
          chill: "I want something chill 😴",
        };
        processMessage(labelMap[moodName] || `Feeling ${moodName}`, moodResult);
      }
    },
    [processMessage]
  );

  // ─── Surprise Me ───
  const surpriseMe = useCallback(() => {
    const surprise = getSurpriseCategory();
    processMessage("🎲 Surprise me!", surprise);
  }, [processMessage]);

  // ─── Voice Input ───
  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      addMessage({
        role: "bot",
        text: "Sorry, voice input isn't supported in your browser. Try Chrome for the best experience!",
        movies: [],
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(t);
          sendMessage(t);
        } else {
          interimTranscript += t;
        }
      }
      if (interimTranscript) setTranscript(interimTranscript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [addMessage, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // ─── Toggle panel ───
  const toggleChat = useCallback(() => setIsOpen((p) => !p), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  // ─── Clear history ───
  const clearHistory = useCallback(() => {
    const fresh = [{ ...WELCOME_MESSAGE, timestamp: Date.now() }];
    setMessages(fresh);
    setLastMood(null);
    saveHistory(fresh);
  }, []);

  return {
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
  };
}
