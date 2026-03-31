/**
 * Mood Detection Engine for CineHub AI Chatbot
 *
 * Maps user emotions/feelings to movie search queries and
 * generates contextual bot responses.
 */

// ─── Mood → Category Mapping ───
const MOOD_MAP = [
  {
    mood: "sad",
    keywords: ["sad", "lonely", "depressed", "heartbroken", "cry", "crying", "down", "upset", "miserable", "unhappy", "grief", "loss", "blue", "melancholy", "gloomy", "hurt"],
    searchTerms: ["emotional drama", "heartfelt story", "touching film"],
    responses: [
      "I can sense you're feeling down. Here are some deeply moving films that might resonate with you:",
      "Sometimes a good emotional movie is exactly what you need. Try these:",
      "Here are some comforting and heartfelt movies for your mood:",
    ],
    emoji: "😢",
  },
  {
    mood: "happy",
    keywords: ["happy", "excited", "great", "amazing", "wonderful", "cheerful", "joyful", "fantastic", "awesome", "good mood", "elated", "thrilled", "pumped"],
    searchTerms: ["feel good comedy", "uplifting adventure", "fun family"],
    responses: [
      "You're glowing! Here are some feel-good movies to keep the vibes going:",
      "Amazing energy! These movies will match your vibe perfectly:",
      "Let's keep that happiness rolling with these awesome picks:",
    ],
    emoji: "😊",
  },
  {
    mood: "angry",
    keywords: ["angry", "mad", "furious", "frustrated", "annoyed", "irritated", "rage", "pissed", "hate", "fed up", "livid"],
    searchTerms: ["action revenge thriller", "intense crime drama", "martial arts"],
    responses: [
      "Channel that energy! Here are some intense, high-adrenaline movies:",
      "Sometimes you need a movie that matches your fire. Try these:",
      "These action-packed movies will help you channel that intensity:",
    ],
    emoji: "😡",
  },
  {
    mood: "romantic",
    keywords: ["romantic", "love", "romance", "loving", "date", "crush", "valentine", "affection", "passionate", "in love", "soulmate", "dreamy"],
    searchTerms: ["romantic love story", "romance drama", "love comedy"],
    responses: [
      "Love is in the air! Here are some beautiful romance movies for you:",
      "Feeling romantic? These films will sweep you off your feet:",
      "Perfect mood for love stories. Here are my top picks:",
    ],
    emoji: "😍",
  },
  {
    mood: "chill",
    keywords: ["chill", "relax", "relaxed", "calm", "peaceful", "lazy", "cozy", "bored", "nothing to do", "laid back", "mellow", "easy", "sleepy", "tired", "exhausted"],
    searchTerms: ["light comedy", "animated adventure", "feel good"],
    responses: [
      "Time to kick back! Here are some easy-going movies to relax with:",
      "Perfect vibe for a chill session. These movies won't disappoint:",
      "Grab some snacks and enjoy these laid-back picks:",
    ],
    emoji: "😴",
  },
  {
    mood: "scared",
    keywords: ["scared", "afraid", "spooky", "horror", "creepy", "frightened", "terrified", "nightmare", "dark", "eerie"],
    searchTerms: ["horror thriller", "psychological suspense", "scary film"],
    responses: [
      "Feeling brave? Here are some spine-tingling movies for you:",
      "Ready to be scared? These will keep you on the edge of your seat:",
      "If you dare… here are some terrifying picks:",
    ],
    emoji: "👻",
  },
  {
    mood: "adventurous",
    keywords: ["adventure", "adventurous", "explore", "travel", "journey", "epic", "quest", "wander", "discover", "expedition"],
    searchTerms: ["epic adventure", "exploration journey", "fantasy quest"],
    responses: [
      "Adventure awaits! Here are some epic journeys to embark on:",
      "Ready for an adventure? These films will take you places:",
      "Buckle up! These adventurous movies will blow your mind:",
    ],
    emoji: "🗺️",
  },
  {
    mood: "inspired",
    keywords: ["inspired", "motivated", "inspiration", "motivate", "ambitious", "aspire", "dream", "goal", "achieve", "success", "determined"],
    searchTerms: ["inspiring true story", "biographical drama", "motivational"],
    responses: [
      "Let's fuel that fire! Here are some truly inspiring movies:",
      "These stories of triumph and perseverance will motivate you:",
      "Ready to be inspired? These films will push you forward:",
    ],
    emoji: "✨",
  },
  {
    mood: "nostalgic",
    keywords: ["nostalgic", "nostalgia", "remember", "childhood", "old times", "classic", "retro", "throwback", "memories", "miss"],
    searchTerms: ["classic film", "nostalgic coming of age", "retro adventure"],
    responses: [
      "Taking a trip down memory lane? Here are some timeless classics:",
      "Nostalgia hits different. These films will bring back the feels:",
      "Here are some beloved classics that never get old:",
    ],
    emoji: "🎞️",
  },
  {
    mood: "intense",
    keywords: ["intense", "thriller", "suspense", "edge", "gripping", "mind-blowing", "mind bending", "twist", "tense", "adrenaline", "action"],
    searchTerms: ["thriller suspense", "action thriller", "crime mystery"],
    responses: [
      "You want intensity? These movies will keep you glued to the screen:",
      "Prepare for non-stop thrills with these gripping films:",
      "Edge-of-your-seat cinema incoming. Here are my picks:",
    ],
    emoji: "🔥",
  },
];

// ─── Follow-up patterns ───
const FOLLOW_UP_PATTERNS = [
  { pattern: /i liked (that|it|this|those)/i, type: "liked" },
  { pattern: /more like (that|this|these|those)/i, type: "more" },
  { pattern: /(yes|yeah|yep|sure|ok|okay|please|absolutely|definitely)/i, type: "affirm" },
  { pattern: /another|one more|next|again/i, type: "more" },
  { pattern: /no|nah|nope|not really|something else|different/i, type: "different" },
];

// ─── Surprise Me categories ───
const SURPRISE_CATEGORIES = [
  { query: "sci-fi space adventure", label: "Sci-Fi Adventure" },
  { query: "heist thriller crime", label: "Heist Thriller" },
  { query: "animated fantasy", label: "Animated Fantasy" },
  { query: "mystery detective", label: "Mystery" },
  { query: "war epic drama", label: "War Epic" },
  { query: "superhero action", label: "Superhero" },
  { query: "musical drama", label: "Musical" },
  { query: "documentary nature", label: "Documentary" },
  { query: "western cowboy", label: "Western" },
  { query: "sports underdog", label: "Sports Drama" },
];

/**
 * Detect mood from user text input.
 * Returns { mood, searchQuery, response, emoji } or null if no match.
 */
export function detectMood(text) {
  if (!text || typeof text !== "string") return null;

  const lower = text.toLowerCase().trim();

  for (const entry of MOOD_MAP) {
    const matched = entry.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      const searchQuery =
        entry.searchTerms[Math.floor(Math.random() * entry.searchTerms.length)];
      const response =
        entry.responses[Math.floor(Math.random() * entry.responses.length)];
      return {
        mood: entry.mood,
        searchQuery,
        response,
        emoji: entry.emoji,
      };
    }
  }

  // Fallback: use the user's text as-is for search
  return {
    mood: "general",
    searchQuery: lower,
    response: `Here are some movie suggestions based on "${text}":`,
    emoji: "🎬",
  };
}

/**
 * Detect mood from a quick-select emoji button.
 */
export function detectMoodByEmoji(moodName) {
  const entry = MOOD_MAP.find((m) => m.mood === moodName);
  if (!entry) return null;

  const searchQuery =
    entry.searchTerms[Math.floor(Math.random() * entry.searchTerms.length)];
  const response =
    entry.responses[Math.floor(Math.random() * entry.responses.length)];

  return {
    mood: entry.mood,
    searchQuery,
    response,
    emoji: entry.emoji,
  };
}

/**
 * Check if user message is a follow-up.
 * Returns { type } or null.
 */
export function detectFollowUp(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  for (const fp of FOLLOW_UP_PATTERNS) {
    if (fp.pattern.test(lower)) {
      return { type: fp.type };
    }
  }
  return null;
}

/**
 * Get a random "Surprise Me" category.
 */
export function getSurpriseCategory() {
  const pick =
    SURPRISE_CATEGORIES[Math.floor(Math.random() * SURPRISE_CATEGORIES.length)];
  return {
    mood: "surprise",
    searchQuery: pick.query,
    response: `🎲 Surprise! Here's a random pick from the "${pick.label}" category:`,
    emoji: "🎲",
  };
}

/**
 * Quick-select mood buttons config.
 */
export const MOOD_BUTTONS = [
  { mood: "happy", emoji: "😊", label: "Happy" },
  { mood: "sad", emoji: "😢", label: "Sad" },
  { mood: "angry", emoji: "😡", label: "Angry" },
  { mood: "romantic", emoji: "😍", label: "Romantic" },
  { mood: "chill", emoji: "😴", label: "Chill" },
];

export const WELCOME_MESSAGE = {
  role: "bot",
  text: "Hi 👋 I'm your AI movie assistant.\nTell me how you feel, and I'll suggest something perfect for you.",
  movies: [],
  timestamp: Date.now(),
};
