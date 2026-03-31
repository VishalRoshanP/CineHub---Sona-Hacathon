// Caching removed to:
// 1. Reduce memory usage
// 2. Avoid stale data
// 3. Ensure consistency
// 4. Support free-tier deployment (512MB MongoDB Atlas)
//
// All queries use .lean() for minimal memory footprint.
// Pagination via .limit() prevents large result sets.

import Movie from "../models/movie.model.js";
import { getQueryEmbedding } from "./voyage.service.js";
import {
  normalizeInput,
  levenshtein,
  fuzzyMatch,
  findDidYouMean,
  generateFuzzyRegex,
  generatePhoneticRegexes,
  getPopularTitlePool,
  phoneticSimilarity,
  combinedSimilarity,
} from "./fuzzy.service.js";

const TEXT_SEARCH_INDEX = "default"; // Atlas Search index name for title

// Vector indexes (create these in Atlas)
const VECTOR_SEARCH_INDEX_VOYAGE = "embedding_vector_index"; // path: embedding
const VECTOR_SEARCH_INDEX_HF = "embedding_hf_vector_index"; // path: embedding_hf

const PROJECT_FIELDS = {
  _id: 1,
  title: 1,
  year: 1,
  plot: 1,
  genres: 1,
  poster: 1,
  imdb: 1,
};

const normalizeTextScore = (score) => {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  return score / (score + 10);
};

const normalizeVectorScore = (score) => {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
};

const regexFallback = async (query, limit = 20) => {
  const results = await Movie.find(
    { title: { $regex: query, $options: "i" } },
    PROJECT_FIELDS,
  ).limit(limit).lean();

  return results.map((d) => ({ ...d, score: 0 }));
};

const getVectorConfig = () => {
  const mode = (process.env.EMBEDDING_MODE || "voyage").toLowerCase();

  if (mode === "huggingface" || mode === "hf") {
    return {
      index: VECTOR_SEARCH_INDEX_HF,
      path: "embedding_hf",
    };
  }

  return {
    index: VECTOR_SEARCH_INDEX_VOYAGE,
    path: "embedding",
  };
};

const buildAtlasSearchPipeline = ({
  index,
  query,
  path,
  phraseBoost = 8,
  autocompleteBoost = 5,
  textBoost = 2,
  fuzzy = { maxEdits: 2, prefixLength: 0, maxExpansions: 256 },
  limit = 20,
}) => {
  return [
    {
      $search: {
        index,
        compound: {
          should: [
            {
              phrase: {
                query,
                path,
                score: { boost: { value: phraseBoost } },
              },
            },
            {
              autocomplete: {
                query,
                path,
                score: { boost: { value: autocompleteBoost } },
                fuzzy,
              },
            },
            {
              text: {
                query,
                path,
                score: { boost: { value: textBoost } },
                fuzzy,
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: limit },
    {
      $project: {
        ...PROJECT_FIELDS,
        score: { $meta: "searchScore" },
      },
    },
  ];
};

const regexFallbackField = async (field, query, limit = 20) => {
  const results = await Movie.find(
    { [field]: { $regex: query, $options: "i" } },
    PROJECT_FIELDS,
  ).limit(limit).lean();

  return results.map((d) => ({ ...d, score: 0 }));
};

export const searchMovies = async (query, limit = 20) => {
  if (!query || query.trim().length === 0) return [];

  try {
    const results = await Movie.aggregate(
      buildAtlasSearchPipeline({
        index: TEXT_SEARCH_INDEX,
        query,
        path: "title",
        // Title typos should be tolerated, but keep precision high
        fuzzy: {
          maxEdits: 2,
          prefixLength: 0,
          maxExpansions: 256,
        },
        phraseBoost: 10,
        autocompleteBoost: 6,
        textBoost: 3,
        limit,
      }),
    );

    // User-friendly behavior: if Atlas returns nothing, try regex contains.
    if (!results || results.length === 0) {
      return await regexFallbackField("title", query, limit);
    }

    return results;
  } catch (error) {
    console.warn(
      "Atlas Search error — falling back to regex search:",
      error.message,
    );
    return await regexFallbackField("title", query, limit);
  }
};

export const semanticSearchMovies = async (query, limit = 20) => {
  if (!query || query.trim().length === 0) return [];

  const queryEmbedding = await getQueryEmbedding(query);
  if (!queryEmbedding) return [];

  const { index, path } = getVectorConfig();

  const results = await Movie.aggregate([
    {
      $vectorSearch: {
        index,
        path,
        queryVector: queryEmbedding,
        numCandidates: Math.max(200, limit * 10),
        limit,
      },
    },
    {
      $project: {
        ...PROJECT_FIELDS,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
};

// Heuristic: short queries are usually title searches; long queries are semantic/intent.
const getHybridWeights = (q) => {
  const tokens = String(q).trim().split(/\s+/).filter(Boolean);

  // "Flash Gordon" / "Flash Gordon 1936" should be treated as title-first.
  if (tokens.length <= 4) {
    return { text: 0.85, semantic: 0.15 };
  }

  return { text: 0.4, semantic: 0.6 };
};

export const hybridSearchMovies = async (query, limit = 20) => {
  const weights = getHybridWeights(query);

  const [semantic, text] = await Promise.allSettled([
    semanticSearchMovies(query, limit),
    searchMovies(query, limit),
  ]);

  const semanticResults = semantic.status === "fulfilled" ? semantic.value : [];
  const textResults = text.status === "fulfilled" ? text.value : [];

  // If vector search fails entirely, just return text search output
  if (semantic.status === "rejected") {
    console.warn(
      "Vector search failed (fallback to text):",
      semantic.reason?.message || semantic.reason,
    );
    return textResults;
  }

  // Strong title override:
  // If the top text match is a very strong signal, return text results as-is.
  // This prevents semantic results from hijacking exact title queries.
  const topTextScore = normalizeTextScore(textResults?.[0]?.score);
  const isTitleLikeQuery =
    String(query).trim().split(/\s+/).filter(Boolean).length <= 4;
  if (textResults.length > 0 && isTitleLikeQuery && topTextScore >= 0.25) {
    return textResults;
  }

  const byId = new Map();

  for (const r of textResults) {
    const id = r?._id?.toString?.() ?? String(r?._id);
    byId.set(id, {
      doc: r,
      textScore: normalizeTextScore(r.score),
      semanticScore: 0,
    });
  }

  for (const r of semanticResults) {
    const id = r?._id?.toString?.() ?? String(r?._id);
    const existing = byId.get(id);
    const semScore = normalizeVectorScore(r.score);

    if (existing) {
      existing.semanticScore = Math.max(existing.semanticScore, semScore);
      existing.doc = { ...r, ...existing.doc };
    } else {
      byId.set(id, {
        doc: r,
        textScore: 0,
        semanticScore: semScore,
      });
    }
  }

  return Array.from(byId.values())
    .map(({ doc, semanticScore, textScore }) => ({
      ...doc,
      score: semanticScore * weights.semantic + textScore * weights.text,
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
};

export const getTrendingMovies = async () => {
  const results = await Movie.find(
    {
      "imdb.rating": { $exists: true, $ne: "" },
      poster: { $exists: true, $ne: null },
    },
    {
      ...PROJECT_FIELDS,
      runtime: 1,
      directors: 1,
      cast: 1,
    },
  )
    .sort({ "imdb.rating": -1 })
    .limit(20)
    .lean();

  return results;
};

// --- Trending fallback for empty queries ---
export const getTrendingFallback = async (limit = 5) => {
  const results = await Movie.find(
    {
      "imdb.rating": { $exists: true, $ne: "" },
      poster: { $exists: true, $ne: null },
    },
    PROJECT_FIELDS,
  )
    .sort({ "imdb.votes": -1, "imdb.rating": -1 })
    .limit(limit)
    .lean();
  return results;
};

// --- Autocomplete (prefix-based, fast) ---
export const autocompleteSearch = async (query, limit = 5) => {
  if (!query || query.trim().length < 2) {
    return { movies: [], actors: [], directors: [] };
  }

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixRegex = new RegExp(`^${escaped}`, "i");
  const containsRegex = new RegExp(escaped, "i");

  // Run all three in parallel for speed
  const [movieResults, actorResults, directorResults] = await Promise.all([
    // Movie title matches (prefix first, then contains)
    Movie.find(
      { title: containsRegex, poster: { $exists: true, $ne: null } },
      { title: 1, year: 1, poster: 1, "imdb.rating": 1 },
    )
      .sort({ "imdb.votes": -1 })
      .limit(limit)
      .lean(),

    // Actor matches (search cast array)
    Movie.aggregate([
      { $match: { cast: containsRegex, poster: { $exists: true, $ne: null } } },
      { $unwind: "$cast" },
      { $match: { cast: containsRegex } },
      {
        $group: {
          _id: "$cast",
          movieCount: { $sum: 1 },
          avgRating: { $avg: "$imdb.rating" },
        },
      },
      { $match: { movieCount: { $gte: 2 } } },
      { $sort: { movieCount: -1 } },
      { $limit: limit },
    ]),

    // Director matches
    Movie.aggregate([
      { $match: { directors: containsRegex, poster: { $exists: true, $ne: null } } },
      { $unwind: "$directors" },
      { $match: { directors: containsRegex } },
      {
        $group: {
          _id: "$directors",
          movieCount: { $sum: 1 },
          avgRating: { $avg: "$imdb.rating" },
        },
      },
      { $match: { movieCount: { $gte: 2 } } },
      { $sort: { movieCount: -1 } },
      { $limit: limit },
    ]),
  ]);

  return {
    movies: movieResults.map(m => ({
      _id: m._id,
      title: m.title,
      year: m.year,
      poster: m.poster,
      rating: m.imdb?.rating,
      type: "movie",
    })),
    actors: actorResults.map(a => ({
      name: a._id,
      movieCount: a.movieCount,
      avgRating: parseFloat((a.avgRating || 0).toFixed(1)),
      type: "actor",
    })),
    directors: directorResults.map(d => ({
      name: d._id,
      movieCount: d.movieCount,
      avgRating: parseFloat((d.avgRating || 0).toFixed(1)),
      type: "director",
    })),
  };
};

// --- Fuzzy fallback search (when normal search returns 0 results) ---
// Uses both Levenshtein + phonetic matching for better typo handling
export const fuzzyFallbackSearch = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return { results: [], didYouMean: null };

  const titlePool = await getPopularTitlePool(Movie);
  const didYouMean = findDidYouMean(query, titlePool);

  // Try fuzzy regex search — including phonetic alternative patterns
  const phoneticRegexes = generatePhoneticRegexes(query);
  const primaryFuzzyRegex = generateFuzzyRegex(query);
  let results = [];

  // Try each phonetic regex pattern until we get results
  const allRegexes = primaryFuzzyRegex
    ? [primaryFuzzyRegex, ...phoneticRegexes.filter(r => r !== primaryFuzzyRegex)]
    : phoneticRegexes;

  for (const regex of allRegexes) {
    if (!regex) continue;
    try {
      const found = await Movie.find(
        {
          title: { $regex: regex, $options: "i" },
          poster: { $exists: true, $ne: null },
        },
        { ...PROJECT_FIELDS, cast: 1, directors: 1 },
      )
        .sort({ "imdb.votes": -1 })
        .limit(limit * 2)
        .lean();

      if (found.length > 0) {
        // Merge unique results
        const existingIds = new Set(results.map(r => String(r._id)));
        for (const doc of found) {
          if (!existingIds.has(String(doc._id))) {
            results.push(doc);
            existingIds.add(String(doc._id));
          }
        }
      }
    } catch {
      // Invalid regex — skip quietly
    }
    // Stop if we have enough results
    if (results.length >= limit * 2) break;
  }

  // If fuzzy regex returned nothing, try matching against the title pool
  if (results.length === 0 && didYouMean) {
    results = await Movie.find(
      { title: { $regex: didYouMean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { ...PROJECT_FIELDS, cast: 1, directors: 1 },
    )
      .sort({ "imdb.votes": -1 })
      .limit(limit)
      .lean();
  }

  // Score results using combined Levenshtein + phonetic similarity
  const normalizedQuery = normalizeInput(query);
  const scored = results.map(movie => {
    const normTitle = normalizeInput(movie.title || "");
    const dist = levenshtein(normalizedQuery, normTitle);
    const combined = combinedSimilarity(query, movie.title || "");
    return { ...movie, score: combined, _fuzzyDistance: dist };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    results: scored.slice(0, limit),
    didYouMean,
  };
};

// --- Director search ---
export const searchMoviesByDirector = async (name, limit = 20) => {
  if (!name || name.trim().length === 0) return [];

  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const results = await Movie.find(
    {
      directors: { $regex: escaped, $options: "i" },
      poster: { $exists: true, $ne: null },
    },
    { ...PROJECT_FIELDS, directors: 1, cast: 1 },
  )
    .sort({ "imdb.rating": -1 })
    .limit(limit)
    .lean();

  return results;
};

// --- Dedicated TITLE search (Atlas Search on title) ---
export const searchMoviesByTitle = async (query, limit = 20) => {
  return await searchMovies(query, limit);
};

// --- Dedicated PLOT text search (Atlas Search on plot) ---
export const searchMoviesByPlotText = async (query, limit = 20) => {
  if (!query || query.trim().length === 0) return [];

  try {
    const results = await Movie.aggregate(
      buildAtlasSearchPipeline({
        index: TEXT_SEARCH_INDEX,
        query,
        path: "plot",
        // Plot queries are noisier; be a bit more forgiving
        fuzzy: {
          maxEdits: 2,
          prefixLength: 0,
          maxExpansions: 512,
        },
        phraseBoost: 7,
        autocompleteBoost: 4,
        textBoost: 3,
        limit,
      }),
    );

    // If no results, fallback to regex on plot to satisfy user expectations.
    if (!results || results.length === 0) {
      return await regexFallbackField("plot", query, limit);
    }

    return results;
  } catch (error) {
    console.warn("Plot text search error:", error.message);
    return await regexFallbackField("plot", query, limit);
  }
};

// --- Dedicated PLOT semantic search (Vector Search on embeddings) ---
export const searchMoviesByPlotSemantic = async (query, limit = 20) => {
  return await semanticSearchMovies(query, limit);
};

// --- Movie details by ID ---
export const getMovieById = async (id) => {
  if (!id) return null;

  // Keep it explicit to avoid returning huge payloads
  // .lean() returns a plain JS object — lower memory footprint
  const movie = await Movie.findById(id, {
    ...PROJECT_FIELDS,
    fullplot: 1,
    rated: 1,
    runtime: 1,
    countries: 1,
    languages: 1,
    released: 1,
    directors: 1,
    writers: 1,
    cast: 1,
    awards: 1,
    tomatoes: 1,
    num_mflix_comments: 1,
    type: 1,
  }).lean();

  return movie;
};

// --- Intent-based smart search (multi-factor ranking) ---
export const intentSearchMovies = async (intent, limit = 20) => {
  // Build a search query string from intent
  const queryParts = [];

  // If there's a reference title, search for it specifically
  if (intent.referenceTitle) {
    queryParts.push(intent.referenceTitle);
  }

  // Add mood words for semantic context
  if (intent.moods && intent.moods.length > 0) {
    queryParts.push(...intent.moods);
  }

  // Add keywords
  if (intent.keywords && intent.keywords.length > 0) {
    queryParts.push(...intent.keywords);
  }

  // Add genre names for semantic search context
  if (intent.genres && intent.genres.length > 0) {
    queryParts.push(...intent.genres.map(g => g.toLowerCase()));
  }

  // Add context clues for semantic search
  if (intent.contexts && intent.contexts.length > 0) {
    const contextSemanticMap = {
      night: "atmospheric late-night dark",
      weekend: "entertaining weekend fun",
      friends: "group entertaining social",
      family: "family-friendly wholesome",
      date: "romantic intimate",
      solo: "thought-provoking introspective",
      "after-sad": "uplifting heartwarming cheerful",
      "after-long-day": "relaxing easy light feel-good",
      bored: "exciting thrilling engaging",
      party: "fun entertaining energetic",
    };
    for (const ctx of intent.contexts) {
      if (contextSemanticMap[ctx]) queryParts.push(contextSemanticMap[ctx]);
    }
  }

  // Add actor name as keyword for semantic search
  if (intent.actorName) {
    queryParts.push(intent.actorName);
  }

  // If nothing was extracted, fall back to original query
  const searchQuery = queryParts.length > 0
    ? queryParts.join(" ")
    : intent.originalQuery;

  // Run hybrid search (text + semantic) with a wider net for re-ranking
  const fetchLimit = Math.min(limit * 3, 60);
  let results = await hybridSearchMovies(searchQuery, fetchLimit);

  // If actor name is detected, also do a direct cast search and merge
  if (intent.actorName) {
    const { searchByCast } = await import("./cast.service.js");
    const castFilters = {};
    if (intent.genres && intent.genres.length > 0) {
      castFilters.genre = intent.genres[0];
    }
    if (intent.constraints?.minYear) castFilters.yearMin = intent.constraints.minYear;
    if (intent.constraints?.maxYear) castFilters.yearMax = intent.constraints.maxYear;

    const castResults = await searchByCast(intent.actorName, castFilters, fetchLimit);
    // Merge: add cast results that aren't already in hybrid results
    const existingIds = new Set(results.map(r => String(r._id)));
    for (const cr of castResults) {
      if (!existingIds.has(String(cr._id))) {
        results.push({ ...cr, score: 0.5 }); // base score for cast matches
      }
    }
  }

  // Similar-movie pipeline: when referenceTitle is detected, find the reference
  // movie and boost movies sharing its genres/cast/director
  let refMovie = null;
  if (intent.referenceTitle) {
    try {
      refMovie = await Movie.findOne(
        { title: { $regex: intent.referenceTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { ...PROJECT_FIELDS, cast: 1, directors: 1, genres: 1 },
      ).lean(); // .lean() — minimal memory allocation
    } catch { /* ignore */ }
  }

  // --- Multi-factor intent-aware re-ranking ---
  const intentGenresLower = (intent.genres || []).map(g => g.toLowerCase());
  const constraints = intent.constraints || {};
  const actorLower = intent.actorName ? intent.actorName.toLowerCase() : null;

  // Normalize query for exact-match detection
  const normalizedQuery = normalizeInput(intent.originalQuery || "");

  results = results.map(movie => {
    let boost = 0;
    const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
    const plotText = ((movie.plot || "") + " " + (movie.fullplot || "")).toLowerCase();
    const titleLower = (movie.title || "").toLowerCase();
    const normTitle = normalizeInput(movie.title || "");

    // Factor 0: EXACT title match (highest priority)
    if (normTitle === normalizedQuery || titleLower === normalizedQuery) {
      boost += 10;
    } else {
      // Factor 0b: Fuzzy title match (Levenshtein)
      const dist = levenshtein(normalizedQuery, normTitle);
      if (dist <= 2 && normalizedQuery.length > 3) {
        boost += 5; // Strong fuzzy match
      } else if (dist <= 4 && normalizedQuery.length > 5) {
        boost += 2; // Moderate fuzzy match
      }

      // Factor 0c: Phonetic title match (handles severe typos)
      const phonSim = phoneticSimilarity(normalizedQuery, normTitle);
      if (phonSim >= 0.85) {
        boost += 4; // Strong phonetic match (e.g. "avenjers" → "avengers")
      } else if (phonSim >= 0.65) {
        boost += 2; // Moderate phonetic match
      } else if (phonSim >= 0.5) {
        boost += 0.5; // Weak phonetic hint
      }
    }

    // Factor 1: Genre match boost (0.25 per match)
    const genreMatches = intentGenresLower.filter(g => movieGenres.includes(g));
    boost += genreMatches.length * 0.25;

    // Factor 2: Rating quality boost
    const rating = parseFloat(movie?.imdb?.rating);
    if (!isNaN(rating)) {
      if (rating >= 8.5) boost += 0.2;
      else if (rating >= 8.0) boost += 0.15;
      else if (rating >= 7.0) boost += 0.08;
      else if (rating >= 6.0) boost += 0.03;
    }

    // Factor 3: Popularity boost (based on votes)
    const votes = parseInt(movie?.imdb?.votes);
    if (!isNaN(votes)) {
      if (votes >= 500000) boost += 0.15;
      else if (votes >= 100000) boost += 0.1;
      else if (votes >= 50000) boost += 0.06;
      else if (votes >= 10000) boost += 0.03;
    }

    // Factor 4: Mood keyword presence in plot
    for (const mood of (intent.moods || [])) {
      if (plotText.includes(mood)) boost += 0.1;
    }

    // Factor 5: Keyword presence in title or plot
    for (const kw of (intent.keywords || [])) {
      if (titleLower.includes(kw)) boost += 0.12;
      else if (plotText.includes(kw)) boost += 0.06;
    }

    // Factor 6: Year recency boost (when intent signals "latest/new")
    if (constraints.minYear && movie.year) {
      const movieYear = parseInt(movie.year);
      if (!isNaN(movieYear) && movieYear >= constraints.minYear) {
        const yearDiff = movieYear - constraints.minYear;
        boost += Math.min(0.15, yearDiff * 0.02);
      }
    }

    // Factor 6b: Recent release bonus (movies from last 5 years get slight bump)
    if (movie.year) {
      const currentYear = new Date().getFullYear();
      const movieYear = parseInt(movie.year);
      if (!isNaN(movieYear) && movieYear >= currentYear - 5) {
        boost += 0.05;
      }
    }

    // Factor 7: Cast member match boost
    if (actorLower) {
      const castMatch = (movie.cast || []).some(c => c.toLowerCase().includes(actorLower));
      if (castMatch) boost += 0.5; // Strong boost for actor match
    }

    // Factor 8: Director match boost
    const directorName = intent.directorName;
    if (directorName) {
      const dirLower = directorName.toLowerCase();
      const dirMatch = (movie.directors || []).some(d => d.toLowerCase().includes(dirLower));
      if (dirMatch) boost += 0.6; // Very strong boost for director match
    }

    // Factor 9: Similar-movie boost (when "like X" is detected)
    if (refMovie && String(movie._id) !== String(refMovie._id)) {
      const refGenres = (refMovie.genres || []).map(g => g.toLowerCase());
      const refCast = (refMovie.cast || []).map(c => c.toLowerCase());
      const refDirs = (refMovie.directors || []).map(d => d.toLowerCase());

      // Genre overlap with reference movie
      const sharedGenres = refGenres.filter(g => movieGenres.includes(g));
      boost += sharedGenres.length * 0.2;

      // Shared cast members
      const movieCastLower = (movie.cast || []).map(c => c.toLowerCase());
      const sharedCast = refCast.filter(c => movieCastLower.some(mc => mc.includes(c)));
      boost += sharedCast.length * 0.15;

      // Shared director
      const movieDirsLower = (movie.directors || []).map(d => d.toLowerCase());
      const sharedDirs = refDirs.filter(d => movieDirsLower.some(md => md.includes(d)));
      boost += sharedDirs.length * 0.3;
    }

    // Factor 10: Popularity boost (log-scale normalized)
    if (!isNaN(votes) && votes > 0) {
      const logPop = Math.log10(votes + 1) / 7; // normalize to ~0-1 range
      boost += logPop * 0.1;
    }

    return {
      ...movie,
      score: (movie.score || 0) + boost,
    };
  });

  // --- Apply constraint filters ---

  // Runtime filter
  if (intent.runtimeHint) {
    const { minRuntime, maxRuntime } = intent.runtimeHint;
    results = results.filter(movie => {
      const rt = movie.runtime;
      if (!rt) return true; // keep movies without runtime data
      if (minRuntime && rt < minRuntime) return false;
      if (maxRuntime && rt > maxRuntime) return false;
      return true;
    });
  }

  // Rating minimum filter
  if (constraints.minRating) {
    results = results.filter(movie => {
      const r = parseFloat(movie?.imdb?.rating);
      if (isNaN(r)) return true; // keep movies without rating
      return r >= constraints.minRating;
    });
  }

  // Year range filter
  if (constraints.minYear || constraints.maxYear) {
    results = results.filter(movie => {
      const y = parseInt(movie?.year);
      if (isNaN(y)) return true; // keep movies without year
      if (constraints.minYear && y < constraints.minYear) return false;
      if (constraints.maxYear && y > constraints.maxYear) return false;
      return true;
    });
  }

  // Sort by boosted score descending
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Return top results
  return results.slice(0, limit);
};

