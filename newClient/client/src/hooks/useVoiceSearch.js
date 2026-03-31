import { useState, useCallback, useRef } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * Custom hook for voice search using the Web Speech API.
 * Supports continuous voice mode (Jarvis-style follow-up queries).
 *
 * @param {Object} options
 * @param {(text: string) => void} options.onResult — called with the recognized text
 * @returns {{ listening, voiceStatus, voiceText, startListening, stopListening, isSupported, isContinuous, toggleContinuous }}
 */
export default function useVoiceSearch({ onResult } = {}) {
  const [listening, setListening] = useState(false);
  // idle | listening | result | searching | error | unsupported
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceText, setVoiceText] = useState("");
  const [isContinuous, setIsContinuous] = useState(false);
  const recognitionRef = useRef(null);
  const continuousRef = useRef(false);

  const isSupported = Boolean(SpeechRecognition);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
    setVoiceStatus("idle");
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setVoiceStatus("unsupported");
      return;
    }

    // If already listening, stop
    if (recognitionRef.current) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    setListening(true);
    setVoiceStatus("listening");
    setVoiceText("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setVoiceStatus("result");
      setListening(false);
      recognitionRef.current = null;

      // Speak confirmation
      speak(`Searching for ${transcript}`);

      // Brief pause to show "You said: ..." then trigger search
      setTimeout(() => {
        setVoiceStatus("searching");
        if (onResult) onResult(transcript);

        // In continuous mode, restart listening after a delay
        if (continuousRef.current) {
          setTimeout(() => {
            setVoiceStatus("idle");
            // Auto-restart
            startListening();
          }, 2500);
        } else {
          // Reset status after a moment
          setTimeout(() => {
            setVoiceStatus("idle");
          }, 2500);
        }
      }, 600);
    };

    recognition.onerror = (event) => {
      console.warn("Voice recognition error:", event.error);
      setListening(false);
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        setVoiceStatus("error");
        setVoiceText("Microphone access denied");
      } else if (event.error === "no-speech") {
        setVoiceStatus("error");
        setVoiceText("No speech detected. Try again.");
        // In continuous mode, auto-restart even on no-speech
        if (continuousRef.current) {
          setTimeout(() => {
            setVoiceStatus("idle");
            startListening();
          }, 2000);
          return;
        }
      } else {
        setVoiceStatus("error");
        setVoiceText("Could not recognize. Try again.");
      }

      setTimeout(() => setVoiceStatus("idle"), 3000);
    };

    recognition.onend = () => {
      // Only reset if we haven't already handled result/error
      if (recognitionRef.current) {
        setListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.start();
  }, [onResult, speak, stopListening]);

  const toggleContinuous = useCallback(() => {
    setIsContinuous(prev => {
      const next = !prev;
      continuousRef.current = next;
      if (!next && recognitionRef.current) {
        // If turning off continuous, stop current listening too
        stopListening();
      }
      return next;
    });
  }, [stopListening]);

  return {
    listening,
    voiceStatus,
    voiceText,
    startListening,
    stopListening,
    isSupported,
    isContinuous,
    toggleContinuous,
  };
}
