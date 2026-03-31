import { pipeline } from "@huggingface/transformers";

// Lazy singleton so we only load the model once per process.
let extractorPromise = null;

const getExtractor = async () => {
  if (!extractorPromise) {
    // Runs locally in Node (CPU). First run downloads model weights to cache.
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
  }
  return extractorPromise;
};

/**
 * Get a normalized sentence embedding using Xenova/all-MiniLM-L6-v2.
 * Output: number[] with 384 dims.
 */
export const getHuggingFaceEmbedding = async (text) => {
  if (!text || text.trim().length === 0) return null;

  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });

  // transformers.js returns a Tensor-like object: { data: Float32Array, dims: [1, 384], ... }
  const data = output?.data;
  if (!data || typeof data.length !== "number") {
    throw new Error("HuggingFace embedding output missing data");
  }

  return Array.from(data);
};
