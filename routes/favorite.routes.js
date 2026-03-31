import { Router } from "express";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  toggleFavorite,
  checkFavorite,
} from "../controller/favorite.controller.js";

const router = Router();

router.get("/", getFavorites);
router.post("/add", addFavorite);
router.post("/toggle", toggleFavorite);
router.get("/check/:movieId", checkFavorite);
router.delete("/remove/:movieId", removeFavorite);

export default router;
