// One-shot, idempotent migration for the configured backend. Seeds an empty
// database from server/seed.json (via readDataset -> ensureDataset) and then
// backfills any schema upgrades — currently hashing legacy plaintext passwords
// into bcrypt passwordHashes. Safe to run repeatedly. Run with: npm run db:migrate
import { readDataset, writeDataset, usingMongo } from "./db.js";
import { backfillPasswords } from "./auth/passwords.js";

try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}

const dataset = await readDataset();

let changed = false;
const passwords = await backfillPasswords(dataset);
changed = changed || passwords.changed;
// Future idempotent backfills chain here.

if (changed) {
  await writeDataset(dataset);
}

const where = usingMongo() ? `MongoDB (${process.env.MONGODB_DB || "paperhub"})` : "the JSON file";
console.log(
  `Migrated ${where}: ${dataset.users.length} users, ${dataset.authAccounts.length} accounts` +
    (changed ? " (passwords hashed)" : " (already up to date)") +
    ".",
);
process.exit(0);
