/**
 * POST /api/chat
 *
 * Chatbot endpoint — detects user intent/mood from message text,
 * queries MongoDB for matching movies by genre, rating, and mood,
 * and returns both a conversational reply and actual movie data.
 */

import Movie from "../models/movie.model.js";
import logger from "../utils/logger.js";

// ─── Genre alias map: maps user keywords → actual genre values in MongoDB ───
const GENRE_ALIASES = {
  // Romance
  romantic: "Romance",
  love: "Romance",
  romance: "Romance",
  valentine: "Romance",
  crush: "Romance",
  soulmate: "Romance",
  passionate: "Romance",
  affection: "Romance",

  // Drama / Emotional
  sad: "Drama",
  emotional: "Drama",
  cry: "Drama",
  crying: "Drama",
  heartbroken: "Drama",
  depressed: "Drama",
  grief: "Drama",
  melancholy: "Drama",
  touching: "Drama",
  moving: "Drama",

  // Action
  action: "Action",
  fight: "Action",
  fighting: "Action",
  explosion: "Action",
  adrenaline: "Action",
  intense: "Action",

  // Comedy
  happy: "Comedy",
  funny: "Comedy",
  laugh: "Comedy",
  comedy: "Comedy",
  hilarious: "Comedy",
  cheerful: "Comedy",
  joyful: "Comedy",

  // Horror
  scary: "Horror",
  horror: "Horror",
  spooky: "Horror",
  terrifying: "Horror",
  creepy: "Horror",
  nightmare: "Horror",
  frightening: "Horror",

  // Thriller
  thriller: "Thriller",
  suspense: "Thriller",
  tense: "Thriller",
  gripping: "Thriller",
  mystery: "Mystery",

  // Sci-Fi
  "sci-fi": "Sci-Fi",
  scifi: "Sci-Fi",
  "science fiction": "Sci-Fi",
  space: "Sci-Fi",
  alien: "Sci-Fi",
  futuristic: "Sci-Fi",

  // Animation
  animated: "Animation",
  animation: "Animation",
  cartoon: "Animation",
  anime: "Animation",

  // Adventure
  adventure: "Adventure",
  adventurous: "Adventure",
  explore: "Adventure",
  journey: "Adventure",
  quest: "Adventure",
  epic: "Adventure",

  // Fantasy
  fantasy: "Fantasy",
  magical: "Fantasy",
  magic: "Fantasy",
  mythical: "Fantasy",
  fairy: "Fantasy",

  // Crime
  crime: "Crime",
  heist: "Crime",
  gangster: "Crime",
  mafia: "Crime",
  detective: "Crime",

  // War
  war: "War",
  military: "War",
  soldier: "War",
  battle: "War",

  // Documentary
  documentary: "Documentary",
  real: "Documentary",
  "true story": "Documentary",

  // Western
  western: "Western",
  cowboy: "Western",

  // Musical
  musical: "Musical",
  music: "Musical",
  singing: "Musical",
  dance: "Musical",

  // Family
  family: "Family",
  kids: "Family",
  children: "Family",

  // History
  history: "History",
  historical: "History",
  period: "History",

  // Sport
  sport: "Sport",
  sports: "Sport",
  athletic: "Sport",

  // Biography
  biography: "Biography",
  biopic: "Biography",
  inspiring: "Biography",
  inspirational: "Biography",
  motivated: "Biography",
  motivation: "Biography",
};

// ─── Mood → Reply + Genre + Query mapping ───
const MOOD_INTENTS = [
  {
    keywords: ["romantic", "love", "romance", "date", "valentine", "crush", "soulmate", "passionate", "dreamy", "affection"],
    genre: "Romance",
    replies: [
      "Perfect mood for love stories ❤️ Here are some romantic picks:",
      "Love is in the air! 💕 These romantic movies will sweep you off your feet:",
      "Feeling the love? 😍 Here are beautiful romance films for you:",
    ],
  },
  {
    keywords: ["sad", "emotional", "cry", "crying", "heartbroken", "depressed", "down", "upset", "grief", "melancholy", "gloomy", "lonely", "miserable"],
    genre: "Drama",
    replies: [
      "Here are some deeply emotional movies 😢",
      "Sometimes a good cry is what we need. These films will move you 💧",
      "Feeling blue? These heartfelt dramas might resonate with you 🥺",
    ],
  },
  {
    keywords: ["action", "fight", "intense", "adrenaline", "explosion", "fighting"],
    genre: "Action",
    replies: [
      "Get ready for action! 🔥 These will get your blood pumping:",
      "Time for some adrenaline! 💪 Check out these action-packed movies:",
      "Buckle up for non-stop action! 🎬 Here are my top picks:",
    ],
  },
  {
    keywords: ["happy", "cheerful", "joyful", "funny", "laugh", "comedy", "hilarious", "good mood", "fun"],
    genre: "Comedy",
    replies: [
      "Let's keep those good vibes going! 😊 Here are some feel-good comedies:",
      "Nothing like a good laugh! 😂 These comedies will brighten your day:",
      "Happy mood = comedy time! 🎉 Enjoy these fun picks:",
    ],
  },
  {
    keywords: ["scared", "horror", "scary", "spooky", "creepy", "terrified", "nightmare", "frightened"],
    genre: "Horror",
    replies: [
      "Feeling brave? 👻 These horror movies will keep you up at night:",
      "Ready to be scared? 😱 Here are some spine-tingling picks:",
      "If you dare... 🕷️ These terrifying movies await:",
    ],
  },
  {
    keywords: ["thriller", "suspense", "tense", "gripping", "edge", "mystery", "detective", "mind-bending", "twist"],
    genre: "Thriller",
    replies: [
      "Edge of your seat time! 🔍 These thrillers will keep you guessing:",
      "Love a good mystery? 🕵️ These thrillers are mind-blowing:",
      "Prepare for twists and turns! 😰 Here are gripping thrillers:",
    ],
  },
  {
    keywords: ["adventure", "adventurous", "explore", "journey", "quest", "epic", "travel", "expedition"],
    genre: "Adventure",
    replies: [
      "Adventure awaits! 🗺️ These epic journeys will take you places:",
      "Ready for an adventure? 🏔️ Here are some incredible films:",
      "Buckle up for epic adventures! ⚡ These movies are unforgettable:",
    ],
  },
  {
    keywords: ["animated", "animation", "cartoon", "anime", "pixar"],
    genre: "Animation",
    replies: [
      "Animation magic incoming! 🎨 Here are some amazing animated films:",
      "Who says cartoons are just for kids? 🌟 These animated gems are brilliant:",
      "Time for some animated magic! ✨ Enjoy these visual masterpieces:",
    ],
  },
  {
    keywords: ["sci-fi", "scifi", "science fiction", "space", "alien", "futuristic", "robot", "tech"],
    genre: "Sci-Fi",
    replies: [
      "To infinity and beyond! 🚀 Here are amazing sci-fi movies:",
      "Ready to explore the universe? 🌌 These sci-fi films will blow your mind:",
      "Sci-fi time! 🤖 Here are some incredible futuristic picks:",
    ],
  },
  {
    keywords: ["fantasy", "magical", "magic", "mythical", "fairy", "dragon", "wizard"],
    genre: "Fantasy",
    replies: [
      "Enter the realm of fantasy! 🧙‍♂️ These magical movies await:",
      "Time for some magic! ✨ Here are enchanting fantasy films:",
      "Ready for a magical journey? 🐉 These fantasy picks are incredible:",
    ],
  },
  {
    keywords: ["crime", "heist", "gangster", "mafia", "mob"],
    genre: "Crime",
    replies: [
      "Time for some crime drama! 🔫 These films are gripping:",
      "Love a good heist? 💰 Here are top crime movies:",
      "Enter the underworld! 🕶️ These crime films are legendary:",
    ],
  },
  {
    keywords: ["war", "military", "soldier", "battle", "army"],
    genre: "War",
    replies: [
      "War cinema at its finest! ⚔️ These films are powerful:",
      "Ready for some intense war movies? 🎖️ Here are my picks:",
      "These war films capture courage and sacrifice 🏅:",
    ],
  },
  {
    keywords: ["inspired", "motivated", "inspiration", "motivate", "ambitious", "determined", "success", "biography", "biopic"],
    genre: "Biography",
    replies: [
      "Get inspired! 🌟 These biographical films will fuel your fire:",
      "Time for some real-life inspiration! 💪 These true stories are incredible:",
      "Ready to be motivated? ✨ These inspiring films will move you:",
    ],
  },
  {
    keywords: ["family", "kids", "children", "wholesome"],
    genre: "Family",
    replies: [
      "Family movie night! 👨‍👩‍👧‍👦 Here are some wonderful family films:",
      "Perfect for all ages! 🎬 These family movies are heartwarming:",
      "Gather everyone around! 🍿 These family-friendly picks are great:",
    ],
  },
  {
    keywords: ["documentary", "real", "true story", "factual"],
    genre: "Documentary",
    replies: [
      "Time for some real-world stories! 📽️ These documentaries are fascinating:",
      "Truth is stranger than fiction! 🎥 Here are gripping documentaries:",
      "Expand your mind! 🧠 These documentaries are eye-opening:",
    ],
  },
  {
    keywords: ["chill", "relax", "relaxed", "calm", "peaceful", "lazy", "cozy", "bored", "mellow", "easy", "sleepy", "tired"],
    genre: "Comedy",
    extraQuery: { "imdb.rating": { $gte: 7 } },
    replies: [
      "Time to kick back! 😴 Here are some easy-going movies to relax with:",
      "Perfect for a chill session! 🛋️ These movies won't disappoint:",
      "Grab some snacks and enjoy these laid-back picks! 🍿",
    ],
  },
  {
    keywords: ["nostalgic", "nostalgia", "classic", "retro", "throwback", "old", "childhood", "memories"],
    genre: null,
    extraQuery: { year: { $lte: 2000 }, "imdb.rating": { $gte: 7.5 } },
    replies: [
      "Taking a trip down memory lane! 🎞️ Here are some timeless classics:",
      "Nostalgia hits different. These classics never get old! 📼",
      "Here are beloved films that stand the test of time! 🏆",
    ],
  },
];

// ─── Feel good / high-rated intent ───
const FEEL_GOOD_KEYWORDS = ["feel good", "feel-good", "feelgood", "uplifting", "heartwarming", "wholesome", "positive"];

/**
 * Detect intent from user message text.
 * Returns { genre, extraQuery, reply } or null for fallback.
 */
function detectChatIntent(text) {
  const lower = text.toLowerCase().trim();

  // Check feel-good keywords first (rating-based, not genre-based)
  for (const kw of FEEL_GOOD_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        genre: null,
        extraQuery: { "imdb.rating": { $gte: 7.5 } },
        reply: "Here are some feel-good movies to brighten your day! 🌈✨",
      };
    }
  }

  // Check each mood intent
  for (const intent of MOOD_INTENTS) {
    const matched = intent.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      const reply = intent.replies[Math.floor(Math.random() * intent.replies.length)];
      return {
        genre: intent.genre,
        extraQuery: intent.extraQuery || {},
        reply,
      };
    }
  }

  // Try the GENRE_ALIASES map as final fallback (catches single-word genre mentions)
  for (const [keyword, genre] of Object.entries(GENRE_ALIASES)) {
    if (lower.includes(keyword)) {
      return {
        genre,
        extraQuery: {},
        reply: `Here are some great ${genre} movies for you! 🎬`,
      };
    }
  }

  return null;
}

/**
 * POST /api/chat
 *
 * Request body: { message: string }
 * Response: { reply: string, movies: Array }
 */
export const chatHandler = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        reply: "Please send a message! Tell me your mood or what kind of movie you're looking for 🎬",
        movies: [],
      });
    }

    const text = message.trim();
    const intent = detectChatIntent(text);

    // No intent detected → suggest moods
    if (!intent) {
      return res.json({
        reply: `I'd love to help! Try telling me a mood like "romantic", "sad", "action", "funny", "scary", or "adventure" — and I'll find the perfect movies for you! 🎬`,
        movies: [],
      });
    }

    // Build MongoDB query from intent
    const query = {};

    if (intent.genre) {
      query.genres = intent.genre;
    }

    // Merge any extra query conditions (e.g. rating filters)
    Object.assign(query, intent.extraQuery);

    // Ensure we only return movies with posters for a good UI experience
    query.poster = { $exists: true, $ne: null };

    console.log("🤖 Chat Intent Detected:", { text, genre: intent.genre, query });

    // Fetch movies from MongoDB
    const movies = await Movie.find(query)
      .sort({ "imdb.rating": -1, "imdb.votes": -1 })
      .limit(6)
      .select("title poster year genres imdb plot")
      .lean();

    console.log("🎬 Movies Found:", movies.length);

    // If no movies found for this genre, try a broader search
    if (movies.length === 0 && intent.genre) {
      // Fall back to plot-based regex search using genre keyword
      const fallbackMovies = await Movie.find({
        $or: [
          { plot: { $regex: intent.genre, $options: "i" } },
          { genres: { $regex: intent.genre, $options: "i" } },
        ],
        poster: { $exists: true, $ne: null },
      })
        .sort({ "imdb.rating": -1 })
        .limit(6)
        .select("title poster year genres imdb plot")
        .lean();

      if (fallbackMovies.length > 0) {
        return res.json({
          reply: intent.reply,
          movies: fallbackMovies,
        });
      }

      // Still nothing? Return highly rated movies as ultimate fallback
      const topRated = await Movie.find({
        "imdb.rating": { $gte: 7 },
        poster: { $exists: true, $ne: null },
      })
        .sort({ "imdb.rating": -1 })
        .limit(6)
        .select("title poster year genres imdb plot")
        .lean();

      return res.json({
        reply: `I couldn't find exact ${intent.genre} matches, but here are some highly-rated movies you might love! 🌟`,
        movies: topRated,
      });
    }

    res.json({
      reply: intent.reply,
      movies,
    });
  } catch (err) {
    console.error("❌ Chatbot Error:", err);
    logger.error("chatHandler", err);
    res.status(500).json({
      reply: "Oops! Something went wrong. Please try again 🔧",
      movies: [],
    });
  }
};
