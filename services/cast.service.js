/**
 * Cast Service — MongoDB-based cast/actor search
 *
 * Searches the `cast` field on movie documents in sample_mflix.
 * No external API needed — all data comes from the existing collection.
 *
 * Caching removed — all queries hit MongoDB directly.
 * Optimized with .lean() for low-memory (512MB Atlas Free Tier) deployment.
 */

import Movie from "../models/movie.model.js";

const PROJECT_FIELDS = {
  _id: 1,
  title: 1,
  year: 1,
  plot: 1,
  genres: 1,
  poster: 1,
  imdb: 1,
  cast: 1,
  directors: 1,
  runtime: 1,
};

/**
 * Search movies by cast member name.
 * Supports partial, case-insensitive matching.
 *
 * @param {string} name - Actor/cast name to search
 * @param {object} filters - Optional { genre, yearMin, yearMax }
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const searchByCast = async (name, filters = {}, limit = 20) => {
  if (!name || name.trim().length === 0) return [];

  const query = {
    cast: { $regex: name.trim(), $options: "i" },
    poster: { $exists: true, $ne: null },
  };

  // Apply optional filters
  if (filters.genre) {
    query.genres = { $regex: filters.genre, $options: "i" };
  }
  if (filters.yearMin || filters.yearMax) {
    query.year = {};
    if (filters.yearMin) query.year.$gte = parseInt(filters.yearMin);
    if (filters.yearMax) query.year.$lte = parseInt(filters.yearMax);
  }

  const results = await Movie.find(query, PROJECT_FIELDS)
    .sort({ "imdb.rating": -1 })
    .limit(limit)
    .lean();

  return results.map(obj => {
    return {
      ...obj,
      // Highlight which cast member matched
      matchedCast: (obj.cast || []).find(c =>
        c.toLowerCase().includes(name.trim().toLowerCase())
      ) || name,
    };
  });
};

/**
 * Get the most frequently appearing cast members across all movies.
 * Uses MongoDB aggregation pipeline.
 *
 * @param {number} limit - Number of top cast to return
 * @returns {Promise<Array<{ name: string, movieCount: number, topGenres: string[], avgRating: number }>>}
 */
/**
 * Suggest actors matching a partial name (autocomplete).
 * Returns top matches ranked by movie count.
 *
 * @param {string} partial - Partial actor name to match
 * @param {number} limit - Max suggestions
 * @returns {Promise<Array<{ name: string, movieCount: number, avgRating: number, topGenres: string[] }>>}
 */
export const suggestActors = async (partial, limit = 5) => {
  if (!partial || partial.trim().length < 2) return [];

  const regex = partial.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const results = await Movie.aggregate([
    {
      $match: {
        cast: { $exists: true, $ne: [] },
        poster: { $exists: true, $ne: null },
        "imdb.rating": { $exists: true, $gt: 0 },
      },
    },
    { $unwind: "$cast" },
    { $match: { cast: { $regex: regex, $options: "i" } } },
    {
      $group: {
        _id: "$cast",
        movieCount: { $sum: 1 },
        avgRating: { $avg: "$imdb.rating" },
        genres: { $push: "$genres" },
      },
    },
    { $match: { movieCount: { $gte: 2 } } },
    { $sort: { movieCount: -1 } },
    { $limit: limit },
  ]);

  return results.map((r) => {
    const genreFlat = (r.genres || []).flat().filter(Boolean);
    const genreCounts = {};
    genreFlat.forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    return {
      name: r._id,
      movieCount: r.movieCount,
      avgRating: parseFloat((r.avgRating || 0).toFixed(1)),
      topGenres,
    };
  });
};

export const getTopCast = async (limit = 20) => {
  const results = await Movie.aggregate([
    // Only movies with cast, poster, and rating
    {
      $match: {
        cast: { $exists: true, $ne: [] },
        poster: { $exists: true, $ne: null },
        "imdb.rating": { $exists: true, $gt: 0 },
      },
    },
    // Unwind cast array
    { $unwind: "$cast" },
    // Group by cast member
    {
      $group: {
        _id: "$cast",
        movieCount: { $sum: 1 },
        avgRating: { $avg: "$imdb.rating" },
        genres: { $push: "$genres" },
        posterSample: { $first: "$poster" },
      },
    },
    // Only actors with multiple movies
    { $match: { movieCount: { $gte: 3 } } },
    // Sort by movie count (popularity)
    { $sort: { movieCount: -1 } },
    { $limit: limit },
  ]);

  return results.map(r => {
    // Flatten and count genres to find top ones
    const genreFlat = (r.genres || []).flat().filter(Boolean);
    const genreCounts = {};
    genreFlat.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    return {
      name: r._id,
      movieCount: r.movieCount,
      avgRating: parseFloat((r.avgRating || 0).toFixed(1)),
      topGenres,
    };
  });
};
