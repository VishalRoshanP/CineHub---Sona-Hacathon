// Caching removed to:
// 1. Reduce memory usage
// 2. Avoid stale data
// 3. Ensure consistency
// 4. Support free-tier deployment (512MB MongoDB Atlas)

import { parseIntent, generateExplanation } from "../services/intent-parser.js";
import * as movieService from "../services/movie.service.js";
import * as castService from "../services/cast.service.js";
import {
  isFollowUp,
  getOrCreateSession,
  saveContext,
  mergeIntent,
  getContextSummary,
} from "../services/conversation-context.js";
import logger from "../utils/logger.js";

/**
 * GET /api/movies/search/intent?q=<query>&sessionId=<id>&limit=<n>
 *
 * Context-aware intent-based smart search (stateless, direct DB):
 *   1. Parse natural language query into structured intent
 *   2. Detect follow-ups and merge with previous session context
 *   3. If actor detected → route to cast search with optional filters
 *   4. Else → run intent-aware hybrid search
 *   5. Return results with explanations + parsed intent metadata
 */
export const intentSearchMovies = async (req, res, next) => {
  try {
    const { q, limit, sessionId: incomingSessionId } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

    if (!q || q.trim().length === 0) {
      // Empty query → return trending movies
      const trending = await movieService.getTrendingFallback(10);
      return res.json({
        sessionId: null,
        isFollowUp: false,
        contextSummary: null,
        actorMeta: null,
        intent: null,
        results: trending,
        suggestions: [],
        didYouMean: null,
        totalResults: trending.length,
      });
    }

    // 1. Session handling
    const { sessionId, session } = getOrCreateSession(incomingSessionId);

    // 2. Parse the query into structured intent
    let intent = parseIntent(q);
    let isConversationalFollowUp = false;
    let contextSummary = null;

    // 3. Detect follow-up and merge context
    if (session && session.lastIntent && isFollowUp(q)) {
      isConversationalFollowUp = true;
      const prevIntent = session.lastIntent;
      intent = mergeIntent(prevIntent, intent);
      contextSummary = getContextSummary(prevIntent, intent);
    }

    let results;
    let actorMeta = null;

    // 4. Route: cast search vs normal intent search — direct DB queries
    if (intent.actorName) {
      // Build filters from detected genres/year constraints
      const castFilters = {};
      if (intent.genres && intent.genres.length > 0) {
        castFilters.genre = intent.genres[0];
      }
      if (intent.constraints?.minYear) {
        castFilters.yearMin = intent.constraints.minYear;
      }
      if (intent.constraints?.maxYear) {
        castFilters.yearMax = intent.constraints.maxYear;
      }

      const castData = await castService.searchByCast(
        intent.actorName,
        castFilters,
        parsedLimit
      );

      results = castData;
      actorMeta = {
        name: intent.actorName,
        filters: castFilters,
        total: castData.length,
      };
    } else {
      // Normal intent-aware search — queries MongoDB directly
      results = await movieService.intentSearchMovies(intent, parsedLimit);
    }

    // 5. Generate per-result explanations
    const enrichedResults = results.map(movie => ({
      ...movie,
      explanation: generateExplanation(movie, intent),
    }));

    // 5b. Director-based re-ranking (boost director matches to top)
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

    // 6. Fuzzy fallback: when results are empty or very few
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

    // 7. Save context for future follow-ups
    saveContext(sessionId, intent, q);

    logger.dbResult(`Intent search "${q}"`, enrichedResults);

    // If no primary results but have suggestions, use suggestions as results
    const finalResults = enrichedResults.length > 0 ? enrichedResults : suggestions;
    const finalSuggestions = enrichedResults.length > 0 ? suggestions : [];

    // 8. Return intent metadata + results (live data, no cache)
    const responseBody = {
      sessionId,
      isFollowUp: isConversationalFollowUp,
      contextSummary,
      actorMeta,
      intent: {
        genres: intent.genres,
        moods: intent.moods,
        keywords: intent.keywords,
        contexts: intent.contexts || [],
        referenceTitle: intent.referenceTitle,
        runtimeHint: intent.runtimeHint,
        modifiers: intent.modifiers || [],
        constraints: intent.constraints || {},
        actorName: intent.actorName || null,
        directorName: intent.directorName || null,
      },
      results: finalResults,
      suggestions: finalSuggestions,
      didYouMean,
      totalResults: finalResults.length,
    };

    res.json(responseBody);
  } catch (error) {
    logger.error("intentSearchMovies", error);
    next(error);
  }
};
