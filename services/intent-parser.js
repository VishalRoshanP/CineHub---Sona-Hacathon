/**
 * Intent Parser — Advanced Rule-based NLP for Natural Language Movie Queries
 *
 * Multi-layer parsing:
 *   1. Reference title detection ("movie like Interstellar")
 *   2. Genre keyword mapping
 *   3. Mood / emotion extraction
 *   4. Context extraction (time, audience, situation)
 *   5. Constraint detection (duration, rating, year, recency)
 *   6. Similarity modifiers ("like X but less complex")
 *   7. Remaining keyword extraction
 *
 * Output shape:
 *   { genres, moods, keywords, referenceTitle, runtimeHint,
 *     context, constraints, modifiers, originalQuery }
 */

// ── Genre keyword mapping ──
const GENRE_MAP = {
  Action:      ["action", "fight", "battle", "explosion", "chase", "combat", "martial arts", "gunfight", "adrenaline"],
  Comedy:      ["comedy", "funny", "humor", "humour", "hilarious", "laugh", "amusing", "friends", "witty", "slapstick", "parody"],
  Drama:       ["drama", "emotional", "sad", "tragic", "tearjerker", "powerful", "deep", "moving", "intense story", "heartfelt"],
  Romance:     ["romance", "romantic", "love", "love story", "relationship", "couple", "dating", "sweetheart"],
  Horror:      ["horror", "scary", "terrifying", "ghost", "haunted", "creepy", "zombie", "vampire", "slasher", "nightmare"],
  "Sci-Fi":    ["sci-fi", "science fiction", "space", "alien", "futuristic", "dystopian", "cyberpunk", "robot", "time travel", "interstellar"],
  Thriller:    ["thriller", "suspense", "tension", "twist", "twist ending", "mystery", "edge of seat", "psychological", "unpredictable"],
  War:         ["war", "military", "soldier", "battlefield", "army", "navy", "combat zone", "world war"],
  Animation:   ["animation", "animated", "cartoon", "anime", "pixar", "disney", "ghibli"],
  Documentary: ["documentary", "real", "true story", "based on", "real events", "biography", "biopic", "docuseries"],
  Fantasy:     ["fantasy", "magic", "magical", "wizard", "dragon", "mythical", "fairy tale", "supernatural", "enchanted"],
  Crime:       ["crime", "heist", "gangster", "mob", "mafia", "detective", "robbery", "con artist", "underworld"],
  Adventure:   ["adventure", "quest", "journey", "expedition", "explore", "survival", "treasure"],
  Family:      ["family", "kids", "children", "wholesome", "kid-friendly", "all ages"],
  Musical:     ["musical", "music", "singing", "dance", "bollywood", "broadway", "concert"],
  Western:     ["western", "cowboy", "outlaw", "frontier", "wild west"],
  History:     ["history", "historical", "period", "ancient", "medieval", "renaissance", "colonial"],
  Sport:       ["sport", "sports", "boxing", "football", "basketball", "baseball", "underdog", "championship", "athlete"],
};

// ── Mood mapping ──
const MOOD_MAP = {
  sad:        ["sad", "cry", "tearjerker", "heartbreaking", "melancholy", "depressing", "sorrowful", "bittersweet", "makes me cry"],
  happy:      ["happy", "feel-good", "feel good", "uplifting", "cheerful", "joyful", "heartwarming", "wholesome", "lighthearted", "light-hearted"],
  dark:       ["dark", "gritty", "bleak", "sinister", "noir", "disturbing", "twisted", "morbid"],
  intense:    ["intense", "gripping", "edge of seat", "nail-biting", "breathtaking", "riveting", "fast-paced", "fast paced", "high-octane"],
  inspiring:  ["inspiring", "inspirational", "motivational", "empowering", "uplifting", "hopeful", "triumphant"],
  funny:      ["funny", "hilarious", "laughing", "silly", "goofy", "comedic", "witty", "absurd", "laugh out loud"],
  romantic:   ["romantic", "love", "passionate", "sensual", "sweet", "tender"],
  thrilling:  ["thrilling", "suspenseful", "tense", "mysterious", "mind-bending", "mind bending", "unpredictable", "unexpected twists"],
  emotional:  ["emotional", "moving", "touching", "deep", "powerful", "sentimental", "poignant", "thought-provoking", "thought provoking"],
  nostalgic:  ["nostalgic", "classic", "old school", "retro", "vintage", "timeless"],
  relaxing:   ["relaxing", "calm", "chill", "soothing", "peaceful", "light", "easy-going", "easy going", "cozy"],
  angry:      ["angry", "rage", "revenge", "furious", "violent", "brutal"],
  scary:      ["scary", "frightening", "creepy", "bone-chilling", "terrifying", "spooky"],
};

// ── Context extraction (time, audience, situation) ──
const CONTEXT_MAP = {
  // Time context
  night:      ["night", "evening", "bedtime", "late night", "midnight", "after dark"],
  weekend:    ["weekend", "saturday", "sunday", "lazy day", "day off"],
  morning:    ["morning", "breakfast", "early"],
  // Audience context
  friends:    ["with friends", "friend group", "group watch", "gang", "crew", "buddies", "bros"],
  family:     ["with family", "family night", "with kids", "with children", "with parents"],
  date:       ["date night", "with partner", "with girlfriend", "with boyfriend", "with wife", "with husband", "couple"],
  solo:       ["alone", "by myself", "solo", "just me"],
  // Situation context
  "after-sad":   ["after a sad movie", "after crying", "need cheering up", "feeling down", "feeling low", "bad day"],
  "after-long-day": ["after a long day", "after work", "tired", "exhausted", "stressed", "need escape", "unwind"],
  "bored":    ["bored", "nothing to do", "pass time", "kill time"],
  "party":    ["party", "celebration", "hangout", "gathering"],
};

// ── Natural language prefix patterns to strip ──
const NL_PREFIX_PATTERNS = [
  /^(?:show\s+me|find\s+me|search\s+for|look\s+up|looking\s+for|i\s+want(?:\s+to\s+(?:watch|see))?|can\s+you\s+(?:find|show|recommend)|give\s+me|suggest(?:\s+me)?|recommend(?:\s+me)?)\s+/i,
  /^(?:i(?:'m|\s+am)\s+looking\s+for|i\s+(?:want|need|wanna\s+(?:watch|see)))\s+/i,
  /^(?:what\s+are\s+(?:some|the\s+best)|list(?:\s+of)?)\s+/i,
];

// ── Well-known actor names for lowercase detection ──
const KNOWN_ACTORS = [
  "tom cruise", "tom hanks", "tom hardy", "leonardo dicaprio", "leonardo di caprio",
  "brad pitt", "johnny depp", "will smith", "dwayne johnson", "the rock",
  "robert downey", "robert downey jr", "scarlett johansson", "chris hemsworth",
  "chris evans", "chris pratt", "ryan reynolds", "ryan gosling", "keanu reeves",
  "morgan freeman", "samuel jackson", "samuel l jackson", "denzel washington",
  "matt damon", "ben affleck", "mark wahlberg", "adam sandler", "jim carrey",
  "vin diesel", "jason statham", "arnold schwarzenegger", "sylvester stallone",
  "bruce willis", "harrison ford", "clint eastwood", "al pacino", "robert de niro",
  "jack nicholson", "anthony hopkins", "cate blanchett", "meryl streep",
  "natalie portman", "jennifer lawrence", "anne hathaway", "emma stone",
  "emma watson", "margot robbie", "gal gadot", "angelina jolie", "julia roberts",
  "sandra bullock", "nicole kidman", "charlize theron", "mila kunis",
  "shah rukh khan", "shahrukh khan", "srk", "aamir khan", "salman khan",
  "akshay kumar", "hrithik roshan", "ranveer singh", "ranbir kapoor",
  "deepika padukone", "priyanka chopra", "alia bhatt", "amitabh bachchan",
  "jackie chan", "jet li", "donnie yen", "tony leung",
  "christian bale", "heath ledger", "joaquin phoenix", "jake gyllenhaal",
  "timothee chalamet", "zendaya", "florence pugh", "ana de armas",
  "oscar isaac", "pedro pascal", "idris elba", "tom holland",
  "benedict cumberbatch", "henry cavill", "jason momoa",
];

// ── Stopwords to ignore in keyword extraction ──
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "must", "need",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "his", "her", "its", "this", "that", "these", "those",
  "of", "in", "on", "at", "to", "for", "with", "from", "by", "about",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "and", "or", "but", "not", "nor", "so", "yet", "both", "either", "neither",
  "movie", "movies", "film", "films", "show", "shows", "series", "watch",
  "want", "looking", "find", "something", "like", "similar", "type",
  "good", "best", "great", "nice", "really", "very", "much", "some",
  "any", "all", "more", "most", "just", "also", "too", "than",
  "recommend", "suggestion", "give", "tell", "me", "please", "one",
  "make", "get", "see", "try", "think", "know", "feel", "need",
  "less", "bit", "little", "lot", "kinda", "kind",
]);

// ── Reference title detection ──
const LIKE_PATTERNS = [
  /(?:movie|film|something)\s+like\s+["']?(.+?)["']?(?:\s+but|\s+less|\s+more|\s+with|\s+without|\s*$)/i,
  /(?:similar\s+to|reminds?\s+me\s+of|vibe\s+of|same\s+as|along\s+the\s+lines?\s+of)\s+["']?(.+?)["']?(?:\s+but|\s+less|\s+more|\s+with|\s*$)/i,
  /like\s+["'](.+?)["']/i,
];

// ── Modifier patterns (applied to reference title) ──
const MODIFIER_PATTERNS = [
  /but\s+(less|more)\s+(\w+)/gi,
  /but\s+(shorter|longer|funnier|darker|lighter|scarier|happier|sadder)/gi,
  /(?:not\s+(?:so|too|as)\s+)(\w+)/gi,
  /without\s+(\w+)/gi,
];

// ── Runtime hints ──
const RUNTIME_HINTS = {
  short:   { maxRuntime: 100 },
  shorter: { maxRuntime: 100 },
  quick:   { maxRuntime: 90  },
  brief:   { maxRuntime: 90  },
  long:    { minRuntime: 150 },
  longer:  { minRuntime: 150 },
  epic:    { minRuntime: 180 },
  lengthy: { minRuntime: 150 },
};

// ── Duration expression patterns ──
const DURATION_PATTERNS = [
  /under\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /less\s+than\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /shorter\s+than\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /(?:max|maximum|at\s+most)\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /(\d+)\s*(?:min|minute|hr|hour)\s+(?:or\s+less|max)/i,
  /over\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /more\s+than\s+(\d+)\s*(?:min|minute|hr|hour)/i,
  /at\s+least\s+(\d+)\s*(?:min|minute|hr|hour)/i,
];

// ── Rating hints ──
const RATING_PATTERNS = [
  { pattern: /(?:highly?\s+rated|top[- ]rated|best[- ]rated|award[- ]winning|acclaimed|masterpiece)/i, minRating: 7.5 },
  { pattern: /(?:above|over|at\s+least|minimum)\s+(\d+(?:\.\d+)?)\s*(?:rating|rated|stars?|imdb)/i, extract: true },
  { pattern: /(\d+(?:\.\d+)?)\+?\s*(?:rating|rated|stars?|imdb)/i, extract: true },
];

// ── Year / recency patterns ──
const YEAR_PATTERNS = [
  { pattern: /(?:latest|newest|recent|new|current|modern|contemporary)/i, yearsBack: 5 },
  { pattern: /(?:this\s+year|20(?:2[4-9]|3\d))/i, yearsBack: 1 },
  { pattern: /(?:last\s+(?:few\s+)?years?)/i, yearsBack: 3 },
  { pattern: /(\d{4})s?\s*(?:movie|film)?/i, decade: true },
  { pattern: /(?:from|in|around|circa)\s+(\d{4})/i, exactYear: true },
  { pattern: /(?:old|older|classic|retro|vintage)\s+(?:movie|film)?/i, maxYear: 2000 },
  { pattern: /(?:90s|nineties)/i, minYear: 1990, maxYear: 1999 },
  { pattern: /(?:80s|eighties)/i, minYear: 1980, maxYear: 1989 },
  { pattern: /(?:70s|seventies)/i, minYear: 1970, maxYear: 1979 },
  { pattern: /(?:2000s|two\s+thousands)/i, minYear: 2000, maxYear: 2009 },
  { pattern: /(?:2010s|twenty\s+tens)/i, minYear: 2010, maxYear: 2019 },
];

// ── Director name detection & mapping ──
const DIRECTOR_MAP = {
  nolan:       "Christopher Nolan",
  spielberg:   "Steven Spielberg",
  tarantino:   "Quentin Tarantino",
  scorsese:    "Martin Scorsese",
  kubrick:     "Stanley Kubrick",
  hitchcock:   "Alfred Hitchcock",
  fincher:     "David Fincher",
  villeneuve:  "Denis Villeneuve",
  ridley:      "Ridley Scott",
  coppola:     "Francis Ford Coppola",
  cameron:     "James Cameron",
  anderson:    "Wes Anderson",
  burton:      "Tim Burton",
  zemeckis:    "Robert Zemeckis",
  jackson:     "Peter Jackson",
  eastwood:    "Clint Eastwood",
  bay:         "Michael Bay",
  snyder:      "Zack Snyder",
  scott:       "Ridley Scott",
  lucas:       "George Lucas",
  wachowski:   "Lana Wachowski",
  miyazaki:    "Hayao Miyazaki",
  rajamouli:   "S.S. Rajamouli",
  shankar:     "Shankar",
  hirani:      "Rajkumar Hirani",
};

const DIRECTOR_PATTERNS = [
  /(?:directed\s+by|director)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:directed|direction)/i,
  /(?:movies?|films?)\s+(?:directed\s+by|by\s+director)\s+([a-z]+(?:\s+[a-z]+)*)/i,
];

// ── Actor name detection patterns ──
const ACTOR_PATTERNS = [
  /(?:movies?|films?)\s+(?:of|by|with|starring|featuring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:movies?|films?)/i,
  /(?:acted\s+by|starring|featuring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  /(?:movies?|films?)\s+(?:of|by|with|starring)\s+([a-z]+(?:\s+[a-z]+)+)/i,
];

// ── Additional year / range patterns ──
const EXTRA_YEAR_PATTERNS = [
  // "action movies 2020" — standalone 4-digit year at word boundary
  { pattern: /\b(20[0-2]\d|19[5-9]\d)\b/i, exactYear: true },
  // "movies between 2015 and 2020"
  { pattern: /between\s+(\d{4})\s+(?:and|to|-)\s+(\d{4})/i, range: true },
  // "movies after 2015" / "movies before 2020"
  { pattern: /after\s+(\d{4})/i, after: true },
  { pattern: /before\s+(\d{4})/i, before: true },
  // "movies since 2018"
  { pattern: /since\s+(\d{4})/i, after: true },
];

// ── Quality patterns ──
const QUALITY_PATTERNS = [
  { pattern: /\b(?:best|top|greatest|finest|must[- ]?watch|must[- ]?see)\b/i, minRating: 7.5 },
];


/**
 * Parse a natural language query into a structured intent object.
 *
 * @param {string} query - The raw user query
 * @returns {object} Structured intent
 */
export function parseIntent(query) {
  if (!query || typeof query !== "string") {
    return {
      genres: [], moods: [], keywords: [], contexts: [],
      referenceTitle: null, runtimeHint: null, modifiers: [],
      constraints: {}, actorName: null, directorName: null, originalQuery: "",
    };
  }

  const original = query.trim();

  // Strip natural language prefixes: "show me action movies" → "action movies"
  let cleaned = original;
  for (const pattern of NL_PREFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  const q = cleaned.toLowerCase();

  // 1. Detect reference titles ("movie like Interstellar")
  let referenceTitle = null;
  for (const pattern of LIKE_PATTERNS) {
    const match = q.match(pattern);
    if (match && match[1]) {
      referenceTitle = match[1].trim().replace(/['"]/g, "");
      break;
    }
  }

  // 2. Extract modifiers ("but less complex", "but funnier")
  const modifiers = [];
  for (const pattern of MODIFIER_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(q)) !== null) {
      modifiers.push(match[0].trim());
    }
  }

  // 3. Extract genres
  const genres = [];
  const matchedGenreTokens = new Set();
  for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        if (!genres.includes(genre)) genres.push(genre);
        kw.split(/\s+/).forEach(t => matchedGenreTokens.add(t));
      }
    }
  }

  // 4. Extract moods
  const moods = [];
  const matchedMoodTokens = new Set();
  for (const [mood, keywords] of Object.entries(MOOD_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        if (!moods.includes(mood)) moods.push(mood);
        kw.split(/\s+/).forEach(t => matchedMoodTokens.add(t));
      }
    }
  }

  // 5. Extract context (time, audience, situation)
  const contexts = [];
  const matchedContextTokens = new Set();
  for (const [ctx, keywords] of Object.entries(CONTEXT_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        if (!contexts.includes(ctx)) contexts.push(ctx);
        kw.split(/\s+/).forEach(t => matchedContextTokens.add(t));
      }
    }
  }

  // 6. Runtime hints (keyword-based)
  let runtimeHint = null;
  const runtimeTokens = new Set();
  for (const [word, hint] of Object.entries(RUNTIME_HINTS)) {
    if (q.includes(word)) {
      runtimeHint = hint;
      runtimeTokens.add(word);
      break;
    }
  }

  // 6b. Duration expression patterns ("under 2 hours")
  for (const pattern of DURATION_PATTERNS) {
    const match = q.match(pattern);
    if (match && match[1]) {
      let minutes = parseInt(match[1]);
      // Convert hours to minutes if needed
      if (/hr|hour/i.test(match[0])) {
        minutes *= 60;
      }
      const isMax = /under|less|shorter|max|at\s+most|or\s+less/i.test(match[0]);
      runtimeHint = isMax ? { maxRuntime: minutes } : { minRuntime: minutes };
      break;
    }
  }

  // 7. Constraints — rating
  const constraints = {};
  for (const rc of RATING_PATTERNS) {
    const match = q.match(rc.pattern);
    if (match) {
      if (rc.extract && match[1]) {
        constraints.minRating = parseFloat(match[1]);
      } else if (rc.minRating) {
        constraints.minRating = rc.minRating;
      }
      break;
    }
  }

  // 8. Constraints — year / recency
  const currentYear = new Date().getFullYear();
  for (const yp of YEAR_PATTERNS) {
    const match = q.match(yp.pattern);
    if (match) {
      if (yp.yearsBack) {
        constraints.minYear = currentYear - yp.yearsBack;
      } else if (yp.decade && match[1]) {
        const decadeStart = Math.floor(parseInt(match[1]) / 10) * 10;
        constraints.minYear = decadeStart;
        constraints.maxYear = decadeStart + 9;
      } else if (yp.exactYear && match[1]) {
        constraints.minYear = parseInt(match[1]);
        constraints.maxYear = parseInt(match[1]);
      } else if (yp.maxYear) {
        constraints.maxYear = yp.maxYear;
      }
      if (yp.minYear) constraints.minYear = yp.minYear;
      if (yp.maxYear) constraints.maxYear = yp.maxYear;
      break;
    }
  }

  // 9. Detect director names
  let directorName = null;

  // 9a. Check director alias map first (single-word shortcuts like "nolan")
  const qWords = q.split(/\s+/);
  for (const word of qWords) {
    if (DIRECTOR_MAP[word]) {
      directorName = DIRECTOR_MAP[word];
      break;
    }
  }

  // 9b. Check director regex patterns
  if (!directorName) {
    for (const pattern of DIRECTOR_PATTERNS) {
      const match = original.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 2) {
          // Check if it maps to a known director alias
          const candidateLower = candidate.toLowerCase();
          directorName = DIRECTOR_MAP[candidateLower] || candidate;
          break;
        }
      }
    }
  }

  // 10. Detect actor names ("movies of Tom Hanks", "Jim Carrey comedy")
  let actorName = null;

  // 10a. Check known actor names first (handles lowercase: "tom cruise movies")
  for (const knownActor of KNOWN_ACTORS) {
    if (q.includes(knownActor)) {
      // Capitalize properly for display
      actorName = knownActor
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // 10b. Regex-based actor detection (capitalized names)
  if (!actorName) {
    for (const pattern of ACTOR_PATTERNS) {
      const match = original.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Filter out matches that are just genre/mood words
        const candidateLower = candidate.toLowerCase();
        const isGenreMood = [...Object.values(GENRE_MAP), ...Object.values(MOOD_MAP)]
          .flat()
          .some(kw => kw === candidateLower);
        // Also skip if it matched as a director
        const isDirector = Object.values(DIRECTOR_MAP).some(d => d.toLowerCase() === candidateLower)
          || Object.keys(DIRECTOR_MAP).includes(candidateLower);
        if (!isGenreMood && !isDirector && candidate.length > 2) {
          actorName = candidate;
          break;
        }
      }
    }
  }

  // 11. Enhanced year extraction (standalone years, ranges, after/before)
  if (!constraints.minYear && !constraints.maxYear) {
    for (const yp of EXTRA_YEAR_PATTERNS) {
      const match = q.match(yp.pattern);
      if (match) {
        if (yp.range && match[1] && match[2]) {
          constraints.minYear = parseInt(match[1]);
          constraints.maxYear = parseInt(match[2]);
        } else if (yp.after && match[1]) {
          constraints.minYear = parseInt(match[1]);
        } else if (yp.before && match[1]) {
          constraints.maxYear = parseInt(match[1]);
        } else if (yp.exactYear && match[1]) {
          const yr = parseInt(match[1]);
          constraints.minYear = yr;
          constraints.maxYear = yr;
        }
        break;
      }
    }
  }

  // 12. Quality patterns ("best sci-fi movies")
  if (!constraints.minRating) {
    for (const qp of QUALITY_PATTERNS) {
      if (qp.pattern.test(q)) {
        constraints.minRating = qp.minRating;
        break;
      }
    }
  }

  // 13. Extract remaining keywords
  const allMatched = new Set([
    ...matchedGenreTokens, ...matchedMoodTokens,
    ...matchedContextTokens, ...runtimeTokens,
  ]);
  const keywords = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t) && !allMatched.has(t) && t.length > 2)
    .filter((t, i, arr) => arr.indexOf(t) === i);

  return {
    genres,
    moods,
    keywords,
    contexts,
    referenceTitle,
    runtimeHint,
    modifiers,
    constraints,
    actorName,
    directorName,
    originalQuery: original,
  };
}


// ── Explanation templates for human-like output ──
const MOOD_EMOJI = {
  sad: "😢", happy: "😊", dark: "🌑", intense: "🔥", inspiring: "✨",
  funny: "😂", romantic: "💕", thrilling: "😰", emotional: "💔",
  nostalgic: "📼", relaxing: "🌿", angry: "😤", scary: "👻",
};

const CONTEXT_LABELS = {
  night: "🌙 Night viewing", weekend: "📅 Weekend pick", morning: "🌅 Morning watch",
  friends: "👫 With friends", family: "👨‍👩‍👧 Family-friendly", date: "💑 Date night",
  solo: "🎧 Solo watch", "after-sad": "🌈 Post-sadness pick-me-up",
  "after-long-day": "🛋️ Relaxing after a long day", bored: "⚡ Boredom buster",
  party: "🎉 Party watch",
};

/**
 * Generate a human-readable explanation for why a movie matches an intent.
 *
 * @param {object} movie   - movie document
 * @param {object} intent  - parsed intent object
 * @returns {string}
 */
export function generateExplanation(movie, intent) {
  const reasons = [];
  const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
  const plotText = ((movie.plot || "") + " " + (movie.fullplot || "")).toLowerCase();
  const titleLower = (movie.title || "").toLowerCase();

  // 1. Genre match
  const matchedGenres = intent.genres.filter(g => movieGenres.includes(g.toLowerCase()));
  if (matchedGenres.length > 0) {
    reasons.push(`Matches ${matchedGenres.join(" & ")} genre`);
  }

  // 2. Mood/emotion match
  const matchedMoods = intent.moods.filter(m => {
    const moodKws = MOOD_MAP[m] || [];
    return moodKws.some(kw => plotText.includes(kw) || movieGenres.some(g => g.includes(kw)));
  });
  if (matchedMoods.length > 0) {
    const moodLabels = matchedMoods.map(m => `${MOOD_EMOJI[m] || ""} ${m}`).join(", ");
    reasons.push(moodLabels.trim() + " tone");
  } else if (intent.moods.length > 0) {
    const firstMood = intent.moods[0];
    reasons.push(`${MOOD_EMOJI[firstMood] || ""} ${firstMood} vibe`);
  }

  // 3. Context match
  if (intent.contexts && intent.contexts.length > 0) {
    const ctxLabel = CONTEXT_LABELS[intent.contexts[0]];
    if (ctxLabel) reasons.push(ctxLabel);
  }

  // 4. Keyword match
  const matchedKws = intent.keywords.filter(kw =>
    plotText.includes(kw) || titleLower.includes(kw)
  );
  if (matchedKws.length > 0) {
    reasons.push(`"${matchedKws.slice(0, 3).join('", "')}" in storyline`);
  }

  // 5. Reference title
  if (intent.referenceTitle) {
    reasons.push(`Similar to "${intent.referenceTitle}"`);
  }

  // 5b. Actor match
  if (intent.actorName) {
    const actorLower = intent.actorName.toLowerCase();
    const castMatch = (movie.cast || []).find(c => c.toLowerCase().includes(actorLower));
    if (castMatch) {
      reasons.push(`🎭 Stars ${castMatch}`);
    }
  }

  // 5c. Director match
  if (intent.directorName) {
    const dirLower = intent.directorName.toLowerCase();
    const dirMatch = (movie.directors || [])?.find(d => d.toLowerCase().includes(dirLower));
    if (dirMatch) {
      reasons.push(`🎥 Directed by ${dirMatch}`);
    }
  }

  // 6. Rating signal
  const rating = parseFloat(movie?.imdb?.rating);
  if (!isNaN(rating) && rating >= 8.0) {
    reasons.push("⭐ Highly acclaimed");
  } else if (!isNaN(rating) && rating >= 7.0) {
    reasons.push("👍 Well-rated");
  }

  // 7. Runtime match
  if (intent.runtimeHint && movie.runtime) {
    if (intent.runtimeHint.maxRuntime && movie.runtime <= intent.runtimeHint.maxRuntime) {
      reasons.push(`⏱️ Under ${intent.runtimeHint.maxRuntime}min`);
    }
  }

  if (reasons.length === 0) {
    return "🎯 Semantic match — similar meaning to your description";
  }

  return reasons.join(" · ");
}


/**
 * Detect the simplified intent type from a query.
 * Returns { type, value } for quick categorization.
 *
 * @param {string} query
 * @returns {{ type: string, value: any, fullIntent: object }}
 */
export function detectIntent(query) {
  const intent = parseIntent(query);

  // Determine primary intent type based on what was detected
  const signals = [];

  if (intent.actorName) signals.push("actor");
  if (intent.directorName) signals.push("director");
  if (intent.genres.length > 0) signals.push("genre");
  if (intent.constraints?.minYear || intent.constraints?.maxYear) signals.push("year");
  if (intent.referenceTitle) signals.push("similar");

  let type;
  let value;

  if (signals.length === 0) {
    // Pure keyword/title search
    type = "title";
    value = intent.originalQuery;
  } else if (signals.length === 1) {
    type = signals[0];
    switch (type) {
      case "actor":    value = intent.actorName; break;
      case "director": value = intent.directorName; break;
      case "genre":    value = intent.genres; break;
      case "year":     value = intent.constraints; break;
      case "similar":  value = intent.referenceTitle; break;
    }
  } else {
    // Multiple signals = mixed intent
    type = "mixed";
    value = {
      ...(intent.actorName && { actor: intent.actorName }),
      ...(intent.directorName && { director: intent.directorName }),
      ...(intent.genres.length > 0 && { genres: intent.genres }),
      ...((intent.constraints?.minYear || intent.constraints?.maxYear) && { year: intent.constraints }),
      ...(intent.referenceTitle && { similar: intent.referenceTitle }),
    };
  }

  return { type, value, fullIntent: intent };
}
