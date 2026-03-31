import * as movieService from "../services/movie.service.js";
import Movie from "../models/movie.model.js";
import { parseIntent, generateExplanation, detectIntent } from "../services/intent-parser.js";
import * as castService from "../services/cast.service.js";
import logger from "../utils/logger.js";

/**
 * GET /api/movies/autocomplete?q=<query>&limit=<n>
 */
export const autocomplete = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(10, Math.max(1, parseInt(limit) || 5));

    if (!q || q.trim().length < 2) {
      return res.json({ movies: [], actors: [], directors: [] });
    }

    const results = await movieService.autocompleteSearch(q, parsedLimit);
    res.json(results);
  } catch (error) {
    logger.error("autocomplete", error);
    next(error);
  }
};

/**
 * GET /api/movies/search?q=<query>&limit=<n>
 *
 * SMART SEARCH ENDPOINT — routes all queries through the intelligent pipeline:
 *   1. Detect intent (genre, actor, director, year, similar, mixed)
 *   2. Route to appropriate search strategy
 *   3. Apply multi-factor smart ranking
 *   4. Fuzzy fallback for typos / no results
 *   5. Return enriched response with intent metadata
 */
export const searchMovies = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

    // Edge case: empty query → return trending movies
    if (!q || q.trim().length === 0) {
      const trending = await movieService.getTrendingFallback(parsedLimit);
      return res.json({
        results: trending,
        intent: { type: "trending", value: null },
        totalResults: trending.length,
        suggestions: [],
        didYouMean: null,
      });
    }

    // 1. Detect intent from query
    const { type, value, fullIntent: intent } = detectIntent(q);

    let results;
    let actorMeta = null;

    // 2. Route based on intent type
    if (intent.actorName) {
      // Actor-detected → use cast search with optional genre/year filters
      const castFilters = {};
      if (intent.genres && intent.genres.length > 0) {
        castFilters.genre = intent.genres[0];
      }
      if (intent.constraints?.minYear) castFilters.yearMin = intent.constraints.minYear;
      if (intent.constraints?.maxYear) castFilters.yearMax = intent.constraints.maxYear;

      const castData = await castService.searchByCast(
        intent.actorName, castFilters, parsedLimit
      );
      results = castData;
      actorMeta = {
        name: intent.actorName,
        filters: castFilters,
        total: castData.length,
      };
    } else if (intent.genres.length > 0 || intent.moods.length > 0 ||
               intent.directorName || intent.referenceTitle ||
               intent.constraints?.minYear || intent.constraints?.maxYear ||
               intent.contexts?.length > 0) {
      // Rich intent detected → use intent-aware search with re-ranking
      results = await movieService.intentSearchMovies(intent, parsedLimit);
    } else {
      // Simple title/keyword search → hybrid search
      results = await movieService.hybridSearchMovies(q, parsedLimit);
    }

    // 3. Generate per-result explanations
    const enrichedResults = results.map(movie => ({
      ...movie,
      explanation: generateExplanation(movie, intent),
    }));

    // 4. Director-based re-ranking (boost director matches to top)
    if (intent.directorName) {
      const directorMovies = await movieService.searchMoviesByDirector(
        intent.directorName, parsedLimit
      ).catch(() => []);
      const existingIds = new Set(enrichedResults.map(r => String(r._id)));
      for (const dm of directorMovies) {
        if (!existingIds.has(String(dm._id))) {
          enrichedResults.push({
            ...dm,
            score: 0.6,
            explanation: generateExplanation(dm, intent),
          });
        }
      }
    }

    // 5. Fuzzy fallback: when results are empty or very few
    let suggestions = [];
    let didYouMean = null;

    if (enrichedResults.length < 3) {
      const fuzzyData = await movieService.fuzzyFallbackSearch(q, 10);
      didYouMean = fuzzyData.didYouMean;

      if (enrichedResults.length === 0) {
        // Use fuzzy results as primary results
        suggestions = fuzzyData.results.map(movie => ({
          ...movie,
          explanation: "✨ Closest fuzzy match",
        }));
      } else {
        // Add as supplementary suggestions
        const existingIds = new Set(enrichedResults.map(r => String(r._id)));
        suggestions = fuzzyData.results
          .filter(m => !existingIds.has(String(m._id)))
          .slice(0, 5)
          .map(movie => ({
            ...movie,
            explanation: "✨ Similar match",
          }));
      }
    }

    // 6. Build final response
    const finalResults = enrichedResults.length > 0 ? enrichedResults : suggestions;
    const finalSuggestions = enrichedResults.length > 0 ? suggestions : [];

    logger.dbResult(`Smart search "${q}"`, finalResults);

    res.json({
      results: finalResults,
      intent: {
        type,
        value,
        genres: intent.genres,
        moods: intent.moods,
        keywords: intent.keywords,
        actorName: intent.actorName || null,
        directorName: intent.directorName || null,
        referenceTitle: intent.referenceTitle || null,
        constraints: intent.constraints || {},
      },
      actorMeta,
      totalResults: finalResults.length,
      suggestions: finalSuggestions,
      didYouMean,
    });
  } catch (error) {
    logger.error("searchMovies", error);
    next(error);
  }
};

/**
 * GET /api/movies/search/title?q=<query>
 */
export const searchMoviesTitle = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const movies = await movieService.searchMoviesByTitle(q, parsedLimit);
    logger.dbResult(`Title search "${q}"`, movies);
    res.json(movies);
  } catch (error) {
    logger.error("searchMoviesTitle", error);
    next(error);
  }
};

/**
 * GET /api/movies/search/plot/text?q=<query>
 */
export const searchMoviesPlotText = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const movies = await movieService.searchMoviesByPlotText(q, parsedLimit);
    logger.dbResult(`Plot text search "${q}"`, movies);
    res.json(movies);
  } catch (error) {
    logger.error("searchMoviesPlotText", error);
    next(error);
  }
};

/**
 * GET /api/movies/search/plot/semantic?q=<query>
 */
export const searchMoviesPlotSemantic = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const movies = await movieService.searchMoviesByPlotSemantic(q, parsedLimit);
    logger.dbResult(`Semantic search "${q}"`, movies);
    res.json(movies);
  } catch (error) {
    logger.error("searchMoviesPlotSemantic", error);
    next(error);
  }
};

/**
 * GET /api/movies/trending
 */
export const getTrending = async (req, res, next) => {
  try {
    const movies = await movieService.getTrendingMovies();
    logger.dbResult("Trending movies", movies);
    res.json(movies);
  } catch (error) {
    logger.error("getTrending", error);
    next(error);
  }
};

/**
 * Debug route: GET /api/movies/debug/find?title=<title>
 */
export const debugFind = async (req, res, next) => {
  try {
    const { title } = req.query;
    if (!title)
      return res.status(400).json({ message: "title query required" });

    const exact = await Movie.findOne({ title: title });
    const regex = await Movie.find({
      title: { $regex: title, $options: "i" },
    }).limit(10);

    logger.dbResult(`Debug find "${title}"`, regex);
    res.json({ exact, regex });
  } catch (error) {
    logger.error("debugFind", error);
    next(error);
  }
};

/**
 * GET /api/movies/:id
 */
export const getMovieDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movie = await movieService.getMovieById(id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    logger.dbResult(`Movie details [${id}]`, movie);
    res.json(movie);
  } catch (error) {
    logger.error("getMovieDetails", error);
    next(error);
  }
};
