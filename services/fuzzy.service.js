/**
 * Fuzzy Search Service — Levenshtein + Phonetic Typo Tolerance
 *
 * Provides:
 *   1. Levenshtein distance computation
 *   2. Soundex phonetic encoding
 *   3. Double Metaphone phonetic encoding
 *   4. Input normalization (lowercase, trim, remove specials)
 *   5. Combined fuzzy + phonetic matching against candidates
 *   6. "Did you mean?" suggestion generation (Levenshtein + phonetic)
 *   7. Common substitution pattern expansion
 *   8. Fuzzy regex builder for MongoDB queries
 *
 * Zero external dependencies.
 */

// ── Common letter-swap / substitution patterns ──
// These handle frequent misspellings where users swap or confuse similar letter groups
const COMMON_SUBSTITUTIONS = [
  [/ph/g, "f"],      // "phantastic" → "fantastic"
  [/ght/g, "t"],     // "nite" style
  [/ck/g, "k"],      // "bak" → "back"
  [/ee/g, "i"],      // "shi" → "she"
  [/oo/g, "u"],      // "buk" → "book"
  [/ou/g, "o"],      // "colour" → "color"
  [/ie/g, "ei"],     // swap ie/ei
  [/ei/g, "ie"],
  [/er$/g, "re"],    // "centre"/"center"
  [/re$/g, "er"],
  [/ll/g, "l"],      // doubled consonants
  [/ss/g, "s"],
  [/tt/g, "t"],
  [/rr/g, "r"],
  [/nn/g, "n"],
];

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses Wagner-Fischer dynamic programming (O(m*n) time, O(min(m,n)) space).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (!a || !b) return (a || b || "").length;

  const la = a.length;
  const lb = b.length;

  // Short-circuit for identical strings
  if (a === b) return 0;

  // Ensure `b` is the shorter string (optimize space)
  if (la < lb) return levenshtein(b, a);

  // Single-row DP
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Compute Soundex phonetic code for a string.
 * Maps similar-sounding consonants to the same digit.
 *   B,F,P,V → 1    C,G,J,K,Q,S,X,Z → 2    D,T → 3
 *   L → 4           M,N → 5                 R → 6
 *
 * Returns a 4-character code (e.g., "avengers" → "A152").
 *
 * @param {string} str
 * @returns {string}
 */
export function soundex(str) {
  if (!str || typeof str !== "string") return "";
  const s = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (s.length === 0) return "";

  const map = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };

  let code = s[0]; // Keep first letter
  let lastCode = map[s[0]] || "";

  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = map[s[i]];
    if (c && c !== lastCode) {
      code += c;
      lastCode = c;
    } else if (!c) {
      // Vowels/H/W/Y reset the "last code" so identical consonants
      // separated by a vowel are coded twice (e.g., "Robert" → R163)
      lastCode = "";
    }
  }

  return (code + "0000").slice(0, 4);
}

/**
 * Compute Double Metaphone phonetic encoding.
 * A simplified but effective implementation that handles:
 * - Silent letters, GH combinations, PH→F, KN→N, WR→R
 * - Vowel sounds, hard/soft C and G, etc.
 *
 * Returns an array of [primary, alternate] codes.
 *
 * @param {string} str
 * @returns {[string, string]}
 */
export function doubleMetaphone(str) {
  if (!str || typeof str !== "string") return ["", ""];
  const word = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (word.length === 0) return ["", ""];

  let primary = "";
  let alternate = "";
  let pos = 0;
  const len = word.length;

  const at = (p) => (p >= 0 && p < len ? word[p] : "");
  const slice = (p, n) => word.slice(p, p + n);

  // Skip silent initial letters
  if (["GN", "KN", "PN", "AE", "WR"].includes(slice(0, 2))) {
    pos = 1;
  }

  // Initial X → S
  if (at(0) === "X") {
    primary += "S";
    alternate += "S";
    pos = 1;
  }

  while (pos < len && (primary.length < 6 || alternate.length < 6)) {
    const ch = at(pos);

    // Vowels — only encode at start of word
    if ("AEIOUY".includes(ch)) {
      if (pos === 0) {
        primary += "A";
        alternate += "A";
      }
      pos++;
      continue;
    }

    switch (ch) {
      case "B":
        primary += "P";
        alternate += "P";
        pos += at(pos + 1) === "B" ? 2 : 1;
        break;

      case "C":
        if (at(pos + 1) === "H") {
          primary += "X";
          alternate += "X";
          pos += 2;
        } else if ("EIY".includes(at(pos + 1))) {
          primary += "S";
          alternate += "S";
          pos += 2;
        } else {
          primary += "K";
          alternate += "K";
          pos += at(pos + 1) === "C" ? 2 : 1;
        }
        break;

      case "D":
        if (at(pos + 1) === "G" && "EIY".includes(at(pos + 2))) {
          primary += "J";
          alternate += "J";
          pos += 3;
        } else {
          primary += "T";
          alternate += "T";
          pos += at(pos + 1) === "D" ? 2 : 1;
        }
        break;

      case "F":
        primary += "F";
        alternate += "F";
        pos += at(pos + 1) === "F" ? 2 : 1;
        break;

      case "G":
        if (at(pos + 1) === "H") {
          if (pos > 0 && !"AEIOUY".includes(at(pos - 1))) {
            // GH after consonant is silent (e.g., "night")
            pos += 2;
          } else {
            primary += "K";
            alternate += "K";
            pos += 2;
          }
        } else if (at(pos + 1) === "N") {
          // GN — G is silent
          pos += 1;
        } else if ("EIY".includes(at(pos + 1))) {
          primary += "J";
          alternate += "K";
          pos += 2;
        } else {
          primary += "K";
          alternate += "K";
          pos += at(pos + 1) === "G" ? 2 : 1;
        }
        break;

      case "H":
        if ("AEIOUY".includes(at(pos + 1)) && (pos === 0 || "AEIOUY".includes(at(pos - 1)))) {
          primary += "H";
          alternate += "H";
          pos += 2;
        } else {
          pos++;
        }
        break;

      case "J":
        primary += "J";
        alternate += "J";
        pos += at(pos + 1) === "J" ? 2 : 1;
        break;

      case "K":
        primary += "K";
        alternate += "K";
        pos += at(pos + 1) === "K" ? 2 : 1;
        break;

      case "L":
        primary += "L";
        alternate += "L";
        pos += at(pos + 1) === "L" ? 2 : 1;
        break;

      case "M":
        primary += "M";
        alternate += "M";
        pos += at(pos + 1) === "M" ? 2 : 1;
        break;

      case "N":
        primary += "N";
        alternate += "N";
        pos += at(pos + 1) === "N" ? 2 : 1;
        break;

      case "P":
        if (at(pos + 1) === "H") {
          primary += "F";
          alternate += "F";
          pos += 2;
        } else {
          primary += "P";
          alternate += "P";
          pos += "P" === at(pos + 1) ? 2 : 1;
        }
        break;

      case "Q":
        primary += "K";
        alternate += "K";
        pos += at(pos + 1) === "Q" ? 2 : 1;
        break;

      case "R":
        primary += "R";
        alternate += "R";
        pos += at(pos + 1) === "R" ? 2 : 1;
        break;

      case "S":
        if (at(pos + 1) === "H") {
          primary += "X";
          alternate += "X";
          pos += 2;
        } else if (slice(pos, 3) === "SIO" || slice(pos, 3) === "SIA") {
          primary += "X";
          alternate += "S";
          pos += 3;
        } else {
          primary += "S";
          alternate += "S";
          pos += at(pos + 1) === "S" ? 2 : 1;
        }
        break;

      case "T":
        if (at(pos + 1) === "H") {
          primary += "0"; // θ
          alternate += "T";
          pos += 2;
        } else if (slice(pos, 3) === "TIO" || slice(pos, 3) === "TIA") {
          primary += "X";
          alternate += "X";
          pos += 3;
        } else {
          primary += "T";
          alternate += "T";
          pos += at(pos + 1) === "T" ? 2 : 1;
        }
        break;

      case "V":
        primary += "F";
        alternate += "F";
        pos += at(pos + 1) === "V" ? 2 : 1;
        break;

      case "W":
      case "Y":
        if ("AEIOUY".includes(at(pos + 1))) {
          primary += ch;
          alternate += ch;
          pos += 1;
        } else {
          pos++;
        }
        break;

      case "X":
        primary += "KS";
        alternate += "KS";
        pos += at(pos + 1) === "X" ? 2 : 1;
        break;

      case "Z":
        primary += "S";
        alternate += "S";
        pos += at(pos + 1) === "Z" ? 2 : 1;
        break;

      default:
        pos++;
    }
  }

  return [primary.slice(0, 6), alternate.slice(0, 6)];
}

/**
 * Compute a combined phonetic similarity score (0..1).
 * Uses both Soundex and Double Metaphone for robustness.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function phoneticSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalizeInput(a).replace(/\s+/g, "");
  const nb = normalizeInput(b).replace(/\s+/g, "");
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Soundex match
  const sa = soundex(na);
  const sb = soundex(nb);
  let soundexScore = 0;
  if (sa && sb) {
    if (sa === sb) {
      soundexScore = 1.0;
    } else if (sa[0] === sb[0]) {
      // Same first letter — partial match
      let matching = 1;
      for (let i = 1; i < 4; i++) {
        if (sa[i] === sb[i]) matching++;
      }
      soundexScore = matching / 4;
    }
  }

  // Double Metaphone match
  const [mp1, mp1Alt] = doubleMetaphone(na);
  const [mp2, mp2Alt] = doubleMetaphone(nb);
  let metaphoneScore = 0;

  const metaphonePairs = [
    [mp1, mp2], [mp1, mp2Alt], [mp1Alt, mp2], [mp1Alt, mp2Alt],
  ];

  for (const [m1, m2] of metaphonePairs) {
    if (!m1 || !m2) continue;
    if (m1 === m2) {
      metaphoneScore = Math.max(metaphoneScore, 1.0);
    } else {
      // Partial metaphone match
      const maxLen = Math.max(m1.length, m2.length);
      if (maxLen > 0) {
        const dist = levenshtein(m1, m2);
        const sim = 1 - dist / maxLen;
        metaphoneScore = Math.max(metaphoneScore, sim);
      }
    }
  }

  // Combined: weight metaphone higher (more discriminative)
  return soundexScore * 0.35 + metaphoneScore * 0.65;
}

/**
 * Apply common substitution patterns to generate alternative spellings.
 * Returns an array of normalized alternative forms.
 *
 * @param {string} input
 * @returns {string[]}
 */
export function expandSubstitutions(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return [];

  const alternatives = new Set();
  for (const [pattern, replacement] of COMMON_SUBSTITUTIONS) {
    if (pattern.test(normalized)) {
      alternatives.add(normalized.replace(pattern, replacement));
    }
  }

  return [...alternatives];
}

/**
 * Normalize a search input string.
 * - lowercase
 * - trim whitespace
 * - remove special characters except spaces
 * - collapse multiple spaces
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeInput(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute a similarity score between 0 and 1.
 * 1 = identical, 0 = completely different.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function similarity(a, b) {
  const na = normalizeInput(a);
  const nb = normalizeInput(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

/**
 * Compute a combined fuzzy + phonetic similarity score.
 * Blends Levenshtein similarity with phonetic similarity for best results.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function combinedSimilarity(a, b) {
  const editSim = similarity(a, b);
  const phonSim = phoneticSimilarity(a, b);
  // Blend: take the higher of the two, with a bonus if both agree
  const base = Math.max(editSim, phonSim);
  const bonus = Math.min(editSim, phonSim) * 0.2;
  return Math.min(1, base + bonus);
}

/**
 * Find the best fuzzy matches from a list of candidates.
 * Uses combined edit-distance + phonetic scoring.
 *
 * @param {string} input - User query
 * @param {string[]} candidates - Possible matches
 * @param {number} threshold - Minimum similarity (0-1), default 0.4
 * @param {number} maxResults - Maximum results, default 5
 * @returns {Array<{ text: string, score: number, distance: number, phonetic: number }>}
 */
export function fuzzyMatch(input, candidates, threshold = 0.4, maxResults = 5) {
  const normalized = normalizeInput(input);
  if (!normalized || !Array.isArray(candidates)) return [];

  const results = [];
  // Pre-compute phonetic codes for input
  const inputSoundex = soundex(normalized.replace(/\s+/g, ""));
  const [inputMp1, inputMp1Alt] = doubleMetaphone(normalized.replace(/\s+/g, ""));

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normCandidate = normalizeInput(candidate);
    if (!normCandidate) continue;

    // Fast path: substring containment
    if (normCandidate.includes(normalized) || normalized.includes(normCandidate)) {
      results.push({ text: candidate, score: 0.95, distance: 0, phonetic: 1 });
      continue;
    }

    // Check word-level matching for multi-word queries
    const inputWords = normalized.split(" ");
    const candidateWords = normCandidate.split(" ");
    let wordMatchScore = 0;
    let wordPhoneticScore = 0;

    for (const iw of inputWords) {
      let bestWordScore = 0;
      let bestWordPhonetic = 0;
      for (const cw of candidateWords) {
        const ws = 1 - levenshtein(iw, cw) / Math.max(iw.length, cw.length);
        bestWordScore = Math.max(bestWordScore, ws);
        // Phonetic similarity per word
        const ps = phoneticSimilarity(iw, cw);
        bestWordPhonetic = Math.max(bestWordPhonetic, ps);
      }
      wordMatchScore += bestWordScore;
      wordPhoneticScore += bestWordPhonetic;
    }
    wordMatchScore /= inputWords.length;
    wordPhoneticScore /= inputWords.length;

    // Full-string similarity (edit distance)
    const fullScore = similarity(normalized, normCandidate);

    // Full-string phonetic similarity
    const phonScore = phoneticSimilarity(normalized, normCandidate);

    // Combined score: best of edit-distance approaches + phonetic boost
    const editBest = Math.max(fullScore, wordMatchScore);
    const phonBest = Math.max(phonScore, wordPhoneticScore);

    // Blend: strong edit match is primary, phonetic provides rescue for bad typos
    const score = editBest * 0.6 + phonBest * 0.4;
    const distance = levenshtein(normalized, normCandidate);

    if (score >= threshold) {
      results.push({ text: candidate, score, distance, phonetic: phonBest });
    }
  }

  // Sort by score descending, then distance ascending
  results.sort((a, b) => b.score - a.score || a.distance - b.distance);

  return results.slice(0, maxResults);
}

/**
 * Generate a "Did you mean?" suggestion.
 * Uses combined Levenshtein + phonetic scoring.
 *
 * @param {string} query - The user's query
 * @param {string[]} titlePool - Pool of known movie titles
 * @param {number} maxDistance - Maximum Levenshtein distance to consider (default 5)
 * @returns {string|null} Best suggestion or null
 */
export function findDidYouMean(query, titlePool, maxDistance = 5) {
  const normalized = normalizeInput(query);
  if (!normalized || !Array.isArray(titlePool) || titlePool.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  // Also try substitution expansions
  const alternatives = [normalized, ...expandSubstitutions(normalized)];

  for (const title of titlePool) {
    const normTitle = normalizeInput(title);
    if (!normTitle) continue;

    for (const alt of alternatives) {
      // Combined Levenshtein + phonetic scoring
      const dist = levenshtein(alt, normTitle);
      if (dist > maxDistance && dist > normTitle.length * 0.6) continue;

      const editSim = dist === 0 ? 1 : 1 - dist / Math.max(alt.length, normTitle.length);
      const phonSim = phoneticSimilarity(alt, normTitle);
      const score = editSim * 0.5 + phonSim * 0.5;

      if (score > bestScore && dist > 0) {
        bestScore = score;
        bestMatch = title;
      }

      // Also check individual words within the title
      const titleWords = normTitle.split(" ");
      for (const word of titleWords) {
        if (word.length < 3) continue;
        const wordDist = levenshtein(alt, word);
        const wordEditSim = 1 - wordDist / Math.max(alt.length, word.length);
        const wordPhonSim = phoneticSimilarity(alt, word);
        const wordScore = wordEditSim * 0.5 + wordPhonSim * 0.5;

        if (wordDist <= 3 && wordScore > bestScore) {
          bestScore = wordScore;
          bestMatch = title;
        }
      }
    }
  }

  // Only suggest if confidence is reasonable
  return bestScore >= 0.35 ? bestMatch : null;
}

/**
 * Build a permissive regex pattern for fuzzy MongoDB queries.
 * Inserts optional wildcard between characters for typo tolerance.
 *
 * Example: "avngers" → "a.?v.?n.?g.?e.?r.?s"
 *
 * @param {string} query
 * @returns {string} regex pattern string
 */
export function generateFuzzyRegex(query) {
  const normalized = normalizeInput(query);
  if (!normalized) return "";

  // Escape regex special chars, then insert optional wildcards
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chars = [...escaped.replace(/\s+/g, "")];

  if (chars.length <= 2) return escaped;

  // Build pattern: each character can have 0-1 extra characters between
  return chars.join(".?");
}

/**
 * Build multiple fuzzy regex patterns including phonetic alternatives.
 * Returns an array of regex patterns to try.
 *
 * @param {string} query
 * @returns {string[]} Array of regex pattern strings
 */
export function generatePhoneticRegexes(query) {
  const patterns = [];

  // Original fuzzy regex
  const primary = generateFuzzyRegex(query);
  if (primary) patterns.push(primary);

  // Substitution-based alternatives
  const alternatives = expandSubstitutions(query);
  for (const alt of alternatives) {
    const altRegex = generateFuzzyRegex(alt);
    if (altRegex && !patterns.includes(altRegex)) {
      patterns.push(altRegex);
    }
  }

  return patterns;
}

/**
 * Get a cached pool of popular movie titles for fuzzy matching.
 * Lazily loads and caches the title list.
 * Refreshes every 10 minutes.
 */
let _titleCache = [];
let _titleCacheTime = 0;
const TITLE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getPopularTitlePool(MovieModel, limit = 500) {
  const now = Date.now();
  if (_titleCache.length > 0 && now - _titleCacheTime < TITLE_CACHE_TTL) {
    return _titleCache;
  }

  try {
    const movies = await MovieModel.find(
      {
        title: { $exists: true, $ne: "" },
        poster: { $exists: true, $ne: null },
      },
      { title: 1 }
    )
      .sort({ "imdb.votes": -1 })
      .limit(limit)
      .lean();

    _titleCache = movies.map(m => m.title).filter(Boolean);
    _titleCacheTime = now;
    return _titleCache;
  } catch {
    return _titleCache; // return stale cache on error
  }
}
