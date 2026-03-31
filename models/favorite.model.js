import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, default: "default_user" },
    movieId: { type: String, required: true },
    title: { type: String },
    poster: { type: String },
    year: { type: mongoose.Schema.Types.Mixed },
    genres: [String],
    runtime: { type: Number },
    cast: [String],
    plot: { type: String },
    imdb: {
      rating: Number,
      votes: Number,
    },
    addedAt: { type: Date, default: Date.now },
  },
  {
    collection: "favorites",
    timestamps: true,
  }
);

// Compound unique index — prevents duplicate favorites
favoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
