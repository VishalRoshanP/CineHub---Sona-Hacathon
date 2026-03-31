/**
 * Client-side Intent Parser (Enhanced)
 *
 * Mirrors the backend intent-parser.js logic for real-time UI display
 * while the user types. Shows parsed genre, mood, context, constraint,
 * and keyword badges without waiting for a backend response.
 */

const GENRE_MAP = {
  Action:      ["action", "fight", "battle", "explosion", "chase", "combat", "martial arts", "adrenaline"],
  Comedy:      ["comedy", "funny", "humor", "hilarious", "laugh", "friends", "witty", "slapstick", "parody"],
  Drama:       ["drama", "emotional", "sad", "tragic", "tearjerker", "powerful", "deep", "moving", "heartfelt"],
  Romance:     ["romance", "romantic", "love", "love story", "relationship", "couple", "dating"],
  Horror:      ["horror", "scary", "terrifying", "ghost", "haunted", "creepy", "zombie", "vampire"],
  "Sci-Fi":    ["sci-fi", "science fiction", "space", "alien", "futuristic", "cyberpunk", "robot", "time travel", "interstellar"],
  Thriller:    ["thriller", "suspense", "twist", "twist ending", "mystery", "psychological", "unpredictable"],
  War:         ["war", "military", "soldier", "battlefield", "army"],
  Animation:   ["animation", "animated", "cartoon", "anime", "pixar", "disney", "ghibli"],
  Documentary: ["documentary", "real", "true story", "based on", "biography", "biopic"],
  Fantasy:     ["fantasy", "magic", "magical", "wizard", "dragon", "supernatural"],
  Crime:       ["crime", "heist", "gangster", "mob", "mafia", "detective"],
  Adventure:   ["adventure", "quest", "journey", "expedition", "survival"],
  Family:      ["family", "kids", "children", "wholesome"],
  Musical:     ["musical", "music", "singing", "dance"],
  History:     ["history", "historical", "period", "ancient", "medieval"],
  Sport:       ["sport", "sports", "boxing", "football", "basketball", "underdog"],
};

const MOOD_MAP = {
  sad:        ["sad", "cry", "tearjerker", "heartbreaking", "melancholy", "makes me cry"],
  happy:      ["happy", "feel-good", "feel good", "uplifting", "cheerful", "joyful", "heartwarming", "lighthearted"],
  dark:       ["dark", "gritty", "bleak", "sinister", "noir", "disturbing"],
  intense:    ["intense", "gripping", "edge of seat", "nail-biting", "fast-paced", "fast paced"],
  inspiring:  ["inspiring", "inspirational", "motivational", "empowering", "hopeful"],
  funny:      ["funny", "hilarious", "laughing", "silly", "goofy", "comedic", "witty"],
  romantic:   ["romantic", "love", "passionate", "sweet", "tender"],
  thrilling:  ["thrilling", "suspenseful", "tense", "mind-bending", "mind bending", "unpredictable", "unexpected twists"],
  emotional:  ["emotional", "moving", "touching", "deep", "powerful", "poignant", "thought-provoking"],
  nostalgic:  ["nostalgic", "classic", "old school", "retro", "vintage"],
  relaxing:   ["relaxing", "calm", "chill", "soothing", "peaceful", "easy-going", "cozy"],
  scary:      ["scary", "frightening", "creepy", "terrifying", "spooky"],
};

const CONTEXT_MAP = {
  night:       ["night", "evening", "bedtime", "late night", "midnight"],
  weekend:     ["weekend", "saturday", "sunday", "lazy day"],
  friends:     ["with friends", "friend group", "group watch", "buddies"],
  family:      ["with family", "family night", "with kids", "with children"],
  date:        ["date night", "with partner", "with girlfriend", "with boyfriend"],
  solo:        ["alone", "by myself", "solo", "just me"],
  "after-sad": ["after a sad movie", "need cheering up", "feeling down", "bad day"],
  "after-long-day": ["after a long day", "after work", "tired", "exhausted", "stressed"],
};

const CONTEXT_LABELS = {
  night: "🌙 Night",
  weekend: "📅 Weekend",
  friends: "👫 Friends",
  family: "👨‍👩‍👧 Family",
  date: "💑 Date",
  solo: "🎧 Solo",
  "after-sad": "🌈 Cheer up",
  "after-long-day": "🛋️ Unwind",
};

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be",
  "have", "has", "had", "do", "does", "did", "will", "would",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "his", "her", "its", "this", "that",
  "of", "in", "on", "at", "to", "for", "with", "from", "by", "about",
  "and", "or", "but", "not", "so",
  "movie", "movies", "film", "films", "show", "watch",
  "want", "looking", "find", "something", "like", "similar",
  "good", "best", "great", "nice", "really", "very",
  "recommend", "suggestion", "give", "tell", "please",
  "make", "get", "see", "try", "feel", "need",
  "less", "bit", "little", "lot", "kinda", "kind",
]);

// Reference title detection
const LIKE_PATTERNS = [
  /(?:movie|film|something)\s+like\s+["']?(.+?)["']?(?:\s+but|\s+less|\s+more|\s*$)/i,
  /(?:similar\s+to|reminds?\s+me\s+of)\s+["']?(.+?)["']?(?:\s+but|\s*$)/i,
];

// Constraint detection
const CONSTRAINT_PATTERNS = {
  duration: [
    { pattern: /under\s+(\d+)\s*(?:min|minute|hr|hour)/i, type: "max" },
    { pattern: /less\s+than\s+(\d+)\s*(?:min|minute|hr|hour)/i, type: "max" },
    { pattern: /(?:short|shorter|quick|brief)/i, label: "⏱️ Short" },
    { pattern: /(?:long|longer|epic|lengthy)/i, label: "⏱️ Long" },
  ],
  rating: [
    { pattern: /(?:highly?\s+rated|top[- ]rated|award[- ]winning|acclaimed)/i, label: "⭐ High-rated" },
  ],
  recency: [
    { pattern: /(?:latest|newest|recent|new|modern)/i, label: "🆕 Recent" },
    { pattern: /(?:classic|old|retro|vintage)/i, label: "📼 Classic" },
    { pattern: /(?:90s|80s|70s|2000s|2010s)/i, extract: true },
  ],
};

/**
 * Parse a query string into intent components for UI display.
 * @param {string} query
 * @returns {{ genres: string[], moods: string[], keywords: string[],
 *             contexts: Array<{id: string, label: string}>,
 *             constraints: Array<{type: string, label: string}>,
 *             referenceTitle: string|null }}
 */
export function parseIntentClient(query) {
  if (!query || typeof query !== "string") {
    return { genres: [], moods: [], keywords: [], contexts: [], constraints: [], referenceTitle: null };
  }

  const q = query.toLowerCase().trim();
  if (!q) return { genres: [], moods: [], keywords: [], contexts: [], constraints: [], referenceTitle: null };

  // Genres
  const genres = [];
  const matchedTokens = new Set();

  for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        if (!genres.includes(genre)) genres.push(genre);
        kw.split(/\s+/).forEach(t => matchedTokens.add(t));
      }
    }
  }

  // Moods
  const moods = [];
  for (const [mood, keywords] of Object.entries(MOOD_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        if (!moods.includes(mood)) moods.push(mood);
        kw.split(/\s+/).forEach(t => matchedTokens.add(t));
      }
    }
  }

  // Contexts
  const contexts = [];
  for (const [ctx, keywords] of Object.entries(CONTEXT_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        const label = CONTEXT_LABELS[ctx] || ctx;
        if (!contexts.find(c => c.id === ctx)) {
          contexts.push({ id: ctx, label });
        }
        kw.split(/\s+/).forEach(t => matchedTokens.add(t));
      }
    }
  }

  // Constraints
  const constraints = [];
  for (const [type, patterns] of Object.entries(CONSTRAINT_PATTERNS)) {
    for (const cp of patterns) {
      const match = q.match(cp.pattern);
      if (match) {
        let label = cp.label;
        if (!label && cp.type === "max" && match[1]) {
          let mins = parseInt(match[1]);
          if (/hr|hour/i.test(match[0])) mins *= 60;
          label = `⏱️ Under ${mins}min`;
        }
        if (!label && cp.extract && match[0]) {
          label = `📅 ${match[0].trim()}`;
        }
        if (label && !constraints.find(c => c.label === label)) {
          constraints.push({ type, label });
        }
      }
    }
  }

  // Reference title
  let referenceTitle = null;
  for (const pattern of LIKE_PATTERNS) {
    const match = q.match(pattern);
    if (match && match[1]) {
      referenceTitle = match[1].trim().replace(/['"]/g, "");
      break;
    }
  }

  // Split query into words (used for director + actor alias detection)
  const words = q.split(/\s+/);

  // Director detection
  const DIRECTOR_ALIASES = {
    nolan: "Christopher Nolan", spielberg: "Steven Spielberg", tarantino: "Quentin Tarantino",
    scorsese: "Martin Scorsese", kubrick: "Stanley Kubrick", fincher: "David Fincher",
    villeneuve: "Denis Villeneuve", cameron: "James Cameron", hitchcock: "Alfred Hitchcock",
    coppola: "Francis Ford Coppola", jackson: "Peter Jackson", burton: "Tim Burton",
    anderson: "Wes Anderson", eastwood: "Clint Eastwood", snyder: "Zack Snyder",
    lucas: "George Lucas", miyazaki: "Hayao Miyazaki", rajamouli: "S.S. Rajamouli",
    hirani: "Rajkumar Hirani", bay: "Michael Bay",
  };

  let directorName = null;
  for (const word of words) {
    if (DIRECTOR_ALIASES[word]) {
      directorName = DIRECTOR_ALIASES[word];
      break;
    }
  }
  if (directorName) {
    constraints.push({ type: "director", label: `🎥 ${directorName}` });
  }

  // Cast / Actor detection
  const CAST_PATTERNS = [
    /(?:movies?|films?)\s+(?:of|by|with|starring|featuring)\s+(.+?)(?:\s+(?:in|from|after|before|genre|year)|$)/i,
    /(.+?)\s+(?:movies?|films?)\s*$/i,
    /(?:acted\s+by|starring|featuring)\s+(.+?)(?:\s+(?:in|from)|$)/i,
  ];

  // Short aliases for popular actors
  const ACTOR_ALIASES = {
    srk: "Shah Rukh Khan",
    salman: "Salman Khan",
    aamir: "Aamir Khan",
    vijay: "Vijay",
    rajini: "Rajinikanth",
    leo: "Leonardo DiCaprio",
    deniro: "Robert De Niro",
    dicaprio: "Leonardo DiCaprio",
    pitt: "Brad Pitt",
    cruise: "Tom Cruise",
    dwayne: "Dwayne Johnson",
    keanu: "Keanu Reeves",
  };

  let actorName = null;
  let isCastSearch = false;

  // Check aliases first
  for (const word of words) {
    if (ACTOR_ALIASES[word]) {
      actorName = ACTOR_ALIASES[word];
      isCastSearch = true;
      break;
    }
  }

  // Then check regex patterns
  if (!actorName) {
    for (const pattern of CAST_PATTERNS) {
      const match = q.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Filter out pure genre/mood words
        const candidateLower = candidate.toLowerCase();
        const isGenreMood = [...Object.values(GENRE_MAP), ...Object.values(MOOD_MAP)]
          .flat()
          .some((kw) => kw === candidateLower);
        if (!isGenreMood && candidate.length > 2) {
          actorName = candidate;
          isCastSearch = true;
          break;
        }
      }
    }
  }

  // Add actor badge to constraints if detected
  if (actorName) {
    constraints.push({ type: "actor", label: `🎭 ${actorName}` });
  }

  // Keywords
  const keywords = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t) && !matchedTokens.has(t) && t.length > 2)
    .filter((t, i, arr) => arr.indexOf(t) === i);

  return { genres, moods, keywords, contexts, constraints, referenceTitle, actorName, isCastSearch };
}

