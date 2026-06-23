// One-shot migration/seed: load server/seed.json into the configured backend.
// With MONGODB_URI set this populates the MongoDB collections; otherwise it
// (re)writes the JSON file. Run with: npm run db:migrate
import { resetDataset, usingMongo } from "./db.js";

try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}

const dataset = await resetDataset();
const where = usingMongo() ? `MongoDB (${process.env.MONGODB_DB || "paperhub"})` : "the JSON file";
console.log(
  `Seeded ${where}: ${dataset.users.length} users, ${dataset.files.length} files, ` +
    `${dataset.reviewQueue.length} reviews.`,
);
process.exit(0);
