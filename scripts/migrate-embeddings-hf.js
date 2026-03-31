import "dotenv/config";
import mongoose from "mongoose";
import { getHuggingFaceEmbedding } from "../services/hf.service.js";

// One-time migration:
// Creates `embedding_hf: number[]` (384 dims) from the movie `plot` field
// using Xenova/all-MiniLM-L6-v2.
//
// Usage: node scripts/migrate-embeddings-hf.js

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

const COLLECTION = "embedded_movies";
const SOURCE_FIELD = "plot";
const TARGET_FIELD = "embedding_hf";

const main = async () => {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const col = db.collection(COLLECTION);

  // Determine dims from one sample
  const sample = await col.findOne(
    { [SOURCE_FIELD]: { $type: "string", $ne: "" } },
    { projection: { [SOURCE_FIELD]: 1 } },
  );

  if (!sample?.[SOURCE_FIELD]) {
    console.error(`No documents found with non-empty '${SOURCE_FIELD}'`);
    process.exit(1);
  }

  const sampleEmb = await getHuggingFaceEmbedding(sample[SOURCE_FIELD]);
  const dims = sampleEmb?.length || 0;
  if (!dims) {
    console.error("Failed to generate a sample HF embedding.");
    process.exit(1);
  }

  console.log(`Detected HF embedding dimensions: ${dims}`);

  const cursor = col.find(
    {
      [SOURCE_FIELD]: { $type: "string", $ne: "" },
      [TARGET_FIELD]: { $exists: false },
    },
    { projection: { [SOURCE_FIELD]: 1 } },
  );

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    processed += 1;

    const plot = doc[SOURCE_FIELD];
    if (!plot || typeof plot !== "string" || plot.trim().length < 5) {
      skipped += 1;
      continue;
    }

    try {
      const emb = await getHuggingFaceEmbedding(plot);
      if (!emb || emb.length !== dims) {
        skipped += 1;
        continue;
      }

      await col.updateOne({ _id: doc._id }, { $set: { [TARGET_FIELD]: emb } });
      updated += 1;
    } catch (e) {
      skipped += 1;
    }

    if (processed % 50 === 0) {
      console.log(
        `Processed ${processed} | Updated ${updated} | Skipped ${skipped}`,
      );
    }
  }

  console.log(
    `Done. Processed ${processed} | Updated ${updated} | Skipped ${skipped}`,
  );
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("HF migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
