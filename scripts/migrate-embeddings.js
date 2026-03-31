import "dotenv/config";
import mongoose from "mongoose";

// One-time migration:
// Converts `plot_embedding_voyage_3_large` (Binary Float32Array) into `embedding: number[]`
// for MongoDB Atlas Vector Search.
//
// Usage: node scripts/migrate-embeddings.js

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

const COLLECTION = "embedded_movies";
const SOURCE_FIELD = "plot_embedding_voyage_3_large";
const TARGET_FIELD = "embedding";

const binaryToFloat32Array = (bin) => {
  // Atlas/Node driver typically exposes BSON Binary with properties: buffer (Node Buffer)
  // Sometimes it can be a Buffer directly.
  const buf = Buffer.isBuffer(bin)
    ? bin
    : bin?.buffer
      ? Buffer.from(bin.buffer)
      : null;

  if (!buf) return null;
  // Float32Array view over the underlying ArrayBuffer
  const arr = new Float32Array(
    buf.buffer,
    buf.byteOffset,
    Math.floor(buf.byteLength / 4),
  );
  return Array.from(arr);
};

const main = async () => {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const col = db.collection(COLLECTION);

  // Find one doc to detect dimensions
  const sample = await col.findOne(
    { [SOURCE_FIELD]: { $exists: true } },
    { projection: { [SOURCE_FIELD]: 1 } },
  );
  if (!sample?.[SOURCE_FIELD]) {
    console.error(
      `No documents found with field '${SOURCE_FIELD}' in collection '${COLLECTION}'.`,
    );
    process.exit(1);
  }

  const sampleEmbedding = binaryToFloat32Array(sample[SOURCE_FIELD]);
  if (!sampleEmbedding || sampleEmbedding.length === 0) {
    console.error("Failed to decode sample embedding.");
    process.exit(1);
  }

  const dims = sampleEmbedding.length;
  console.log(`Detected embedding dimensions: ${dims}`);

  // Stream docs to avoid loading everything
  const cursor = col.find(
    {
      [SOURCE_FIELD]: { $exists: true },
      // Don’t rewrite if already migrated
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

    const emb = binaryToFloat32Array(doc[SOURCE_FIELD]);
    if (!emb || emb.length !== dims) {
      skipped += 1;
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: { [TARGET_FIELD]: emb } });
    updated += 1;

    if (processed % 500 === 0) {
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
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
