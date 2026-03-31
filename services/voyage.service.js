import axios from "axios";
import { getHuggingFaceEmbedding } from "./hf.service.js";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

/**
 * Generate an embedding for a query.
 * Modes controlled via .env:
 * - EMBEDDING_MODE=voyage (default): calls Voyage AI (voyage-3-large)
 * - EMBEDDING_MODE=huggingface: local embedding using Xenova/all-MiniLM-L6-v2
 * - EMBEDDING_MODE=local/off/disabled: disables embedding generation (hybrid falls back to text)
 */
export const getQueryEmbedding = async (query) => {
  const mode = (process.env.EMBEDDING_MODE || "voyage").toLowerCase();

  if (!query || query.trim().length === 0) return null;

  if (mode === "local" || mode === "off" || mode === "disabled") {
    return null;
  }

  if (mode === "huggingface" || mode === "hf") {
    return await getHuggingFaceEmbedding(query);
  }

  // voyage mode
  if (!VOYAGE_API_KEY) {
    throw new Error(
      "Missing VOYAGE_API_KEY in .env (set EMBEDDING_MODE=huggingface or EMBEDDING_MODE=local to disable Voyage calls)",
    );
  }

  const resp = await axios.post(
    "https://api.voyageai.com/v1/embeddings",
    {
      model: "voyage-3-large",
      input: query,
    },
    {
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  // Expected shape: { data: [ { embedding: number[] } ] }
  const embedding = resp?.data?.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Voyage returned no embedding");
  }
  return embedding;
};
