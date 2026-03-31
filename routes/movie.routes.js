import { Router } from "express";
import {
  searchMovies,
  getTrending,
  debugFind,
  searchMoviesTitle,
  searchMoviesPlotText,
  searchMoviesPlotSemantic,
  getMovieDetails,
  autocomplete,
} from "../controller/movie.controller.js";
import { intentSearchMovies } from "../controller/intent-search.controller.js";
import { searchByCast, getTopCast, suggestCast } from "../controller/cast.controller.js";

const router = Router();

// Intent-based smart search (must come before /search to avoid shadowing)
router.get("/search/intent", intentSearchMovies);

// Autocomplete (fast prefix search)
router.get("/autocomplete", autocomplete);

router.get("/search", searchMovies);

// New explicit search routes
router.get("/search/title", searchMoviesTitle);
router.get("/search/plot/text", searchMoviesPlotText);
router.get("/search/plot/semantic", searchMoviesPlotSemantic);

// Cast-based search
router.get("/cast/search", searchByCast);
router.get("/cast/suggest", suggestCast);
router.get("/cast/top", getTopCast);

router.get("/trending", getTrending);
router.get("/debug/find", debugFind);

// Movie details
router.get("/:id", getMovieDetails);

export default router;

