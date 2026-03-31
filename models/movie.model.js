import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: String,
    year: Number,
    plot: String,
    genres: [String],
    runtime: Number,
    poster: String,
    languages: [String],
    directors: [String],
    cast: [String],
    countries: [String],
    type: String,
    imdb: {
      rating: Number,
      votes: Number,
    },
    // Vector search fields (plain JS arrays)
    embedding: [Number],
    embedding_hf: [Number],
  },
  {
    collection: "embedded_movies",
    strict: false,
  },
);

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
