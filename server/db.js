import * as jsonStore from "./stores/jsonStore.js";
import * as mongoStore from "./stores/mongoStore.js";

// Storage façade. The backend is chosen at call time: MongoDB when MONGODB_URI
// is set, otherwise the JSON-file store (the default and the CI/test fallback).
// server/index.js imports only from here, so swapping backends needs no changes
// elsewhere.

const REQUIRED_KEYS = ["users", "files", "reviewQueue", "authAccounts"];

/** A payload is a valid dataset if it is an object with the core collections. */
export function isValidDataset(data) {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    REQUIRED_KEYS.every((key) => Array.isArray(data[key]))
  );
}

export function usingMongo() {
  return Boolean(process.env.MONGODB_URI);
}

function backend() {
  return usingMongo() ? mongoStore : jsonStore;
}

export const ensureDataset = (...args) => backend().ensureDataset(...args);
export const readDataset = (...args) => backend().readDataset(...args);
export const writeDataset = (...args) => backend().writeDataset(...args);
export const resetDataset = (...args) => backend().resetDataset(...args);

// Uploaded file binaries (the actual PDF bytes).
export const writeFileContent = (...args) => backend().writeFileContent(...args);
export const readFileContent = (...args) => backend().readFileContent(...args);
export const deleteFileContent = (...args) => backend().deleteFileContent(...args);
