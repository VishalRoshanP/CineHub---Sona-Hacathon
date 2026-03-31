import Favorite from "../models/favorite.model.js";
import logger from "../utils/logger.js";

const DEFAULT_USER = "default_user";

/**
 * POST /api/favorites/add
 * Body: { movieId, title, poster, year, genres, runtime, cast, plot, imdb }
 */
export const addFavorite = async (req, res, next) => {
  try {
    const { movieId, title, poster, year, genres, runtime, cast, plot, imdb } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: "movieId is required." });
    }

    // Upsert — if already exists, just return it (no duplicate error)
    const favorite = await Favorite.findOneAndUpdate(
      { userId: DEFAULT_USER, movieId },
      {
        userId: DEFAULT_USER,
        movieId,
        title,
        poster,
        year,
        genres,
        runtime,
        cast: (cast || []).slice(0, 5),
        plot,
        imdb,
        addedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.dbResult(`Add favorite "${title || movieId}"`, favorite);
    res.status(201).json({ message: "Added to favorites", favorite });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      const existing = await Favorite.findOne({ userId: DEFAULT_USER, movieId: req.body.movieId });
      return res.status(200).json({ message: "Already in favorites", favorite: existing });
    }
    logger.error("addFavorite", error);
    next(error);
  }
};

/**
 * DELETE /api/favorites/remove/:movieId
 */
export const removeFavorite = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ message: "movieId is required." });
    }

    const result = await Favorite.findOneAndDelete({
      userId: DEFAULT_USER,
      movieId,
    });

    if (!result) {
      return res.status(404).json({ message: "Favorite not found." });
    }

    logger.dbResult(`Remove favorite [${movieId}]`, result);
    res.json({ message: "Removed from favorites", movieId });
  } catch (error) {
    logger.error("removeFavorite", error);
    next(error);
  }
};

/**
 * GET /api/favorites
 * Returns all favorites for the default user, sorted by most recent.
 */
export const getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ userId: DEFAULT_USER })
      .sort({ addedAt: -1 })
      .lean();

    logger.dbResult("Get favorites", favorites);
    res.json(favorites);
  } catch (error) {
    logger.error("getFavorites", error);
    next(error);
  }
};

/**
 * POST /api/favorites/toggle
 * Body: { movieId, title, poster, year, genres, runtime, cast, plot, imdb }
 * Adds if not exists, removes if exists. Returns { status: "added"|"removed" }
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const { movieId, title, poster, year, genres, runtime, cast, plot, imdb } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: "movieId is required." });
    }

    const existing = await Favorite.findOne({ userId: DEFAULT_USER, movieId: String(movieId) });

    if (existing) {
      await Favorite.deleteOne({ userId: DEFAULT_USER, movieId: String(movieId) });
      logger.dbResult(`Toggle favorite — removed "${title || movieId}"`, existing);
      return res.json({ status: "removed", movieId });
    } else {
      const favorite = await Favorite.create({
        userId: DEFAULT_USER,
        movieId: String(movieId),
        title,
        poster,
        year,
        genres,
        runtime,
        cast: (cast || []).slice(0, 5),
        plot,
        imdb,
        addedAt: new Date(),
      });
      logger.dbResult(`Toggle favorite — added "${title || movieId}"`, favorite);
      return res.json({ status: "added", favorite });
    }
  } catch (error) {
    logger.error("toggleFavorite", error);
    next(error);
  }
};

/**
 * GET /api/favorites/check/:movieId
 * Returns { isFavorite: boolean }
 */
export const checkFavorite = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    if (!movieId) {
      return res.status(400).json({ isFavorite: false });
    }

    const exists = await Favorite.findOne({
      userId: DEFAULT_USER,
      movieId: String(movieId),
    }).lean();

    res.json({ isFavorite: !!exists });
  } catch (error) {
    logger.error("checkFavorite", error);
    next(error);
  }
};
