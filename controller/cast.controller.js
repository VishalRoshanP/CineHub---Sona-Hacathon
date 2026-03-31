import * as castService from "../services/cast.service.js";
import logger from "../utils/logger.js";

/**
 * GET /api/movies/cast/search?name=<actor>&genre=<genre>&yearMin=<y>&yearMax=<y>&limit=<n>
 */
export const searchByCast = async (req, res, next) => {
  try {
    const { name, genre, yearMin, yearMax, limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Actor name is required." });
    }

    const movies = await castService.searchByCast(
      name,
      { genre, yearMin, yearMax },
      parsedLimit
    );

    logger.dbResult(`Cast search "${name}"`, movies);
    res.json({
      actor: name.trim(),
      results: movies,
      total: movies.length,
    });
  } catch (error) {
    logger.error("searchByCast", error);
    next(error);
  }
};

/**
 * GET /api/movies/cast/top?limit=<n>
 */
export const getTopCast = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

    const cast = await castService.getTopCast(parsedLimit);
    logger.dbResult("Top cast", cast);
    res.json(cast);
  } catch (error) {
    logger.error("getTopCast", error);
    next(error);
  }
};

/**
 * GET /api/movies/cast/suggest?q=<partial>&limit=<n>
 */
export const suggestCast = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const parsedLimit = Math.min(10, Math.max(1, parseInt(limit) || 5));

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await castService.suggestActors(q, parsedLimit);
    logger.dbResult(`Cast suggest "${q}"`, suggestions);
    res.json(suggestions);
  } catch (error) {
    logger.error("suggestCast", error);
    next(error);
  }
};
