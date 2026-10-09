// @ts-check
/**
 * PaperHub ESM — async dataset store (Phase 2).
 *
 * Replaces the legacy synchronous model (`fetchDatasetSync` + `window
 * .__paperhubDataset` + whole-dataset `PUT /api/dataset`) with an async,
 * subscription-based store backed by scoped endpoints:
 *
 *   reads:  GET /api/dataset (fallback: GET /api/files/search for lists)
 *   writes: PATCH /api/files/:id[/status], PATCH /api/users/me/*
 *
 * Legacy pages keep working untouched; new code should use
 * `createDatasetStore()` and `subscribe()` instead of touching globals.
 */

import { apiFetch } from "./api.mjs";

/**
 * @typedef {object} StoreOptions
 * @property {() => (string | null)} [getToken] returns the current access token
 * @property {string} [origin]
 * @property {typeof globalThis.fetch} [fetchImpl]
 * @property {() => Promise<string | null>} [refreshFn]
 */

/**
 * @typedef {object} DatasetStore
 * @property {() => any | null} get current cached dataset (null until refresh)
 * @property {(dataset?: any) => Promise<any>} refresh re-fetch + notify
 * @property {(fn: (dataset: any) => void) => () => void} subscribe
 * @property {(id: string, status: string) => Promise<any>} patchFileStatus
 * @property {(id: string, patch: Record<string, unknown>) => Promise<any>} patchFileMeta
 * @property {(prefs: Record<string, string>) => Promise<any>} saveMyPreferences
 * @property {(notificationId: string, read: boolean) => Promise<any>} setNotificationRead
 */

/**
 * @param {StoreOptions} [options]
 * @returns {DatasetStore}
 */
export function createDatasetStore(options = {}) {
  /** @type {any | null} */
  let cached = null;
  /** @type {Set<(dataset: any) => void>} */
  const listeners = new Set();

  const base = {
    get origin() {
      return options.origin;
    },
    get fetchImpl() {
      return options.fetchImpl;
    },
    get refreshFn() {
      return options.refreshFn;
    },
    token() {
      return typeof options.getToken === "function" ? options.getToken() : undefined;
    },
  };

  function notify() {
    for (const fn of listeners) {
      try {
        fn(cached);
      } catch {
        /* a failing subscriber must not break the store */
      }
    }
  }

  /** @type {DatasetStore["refresh"]} */
  async function refresh(dataset) {
    if (dataset !== undefined) {
      cached = dataset;
    } else {
      cached = await apiFetch("/api/dataset", {
        token: base.token() || undefined,
        origin: base.origin,
        fetchImpl: base.fetchImpl,
        refreshFn: base.refreshFn,
      });
    }
    notify();
    return cached;
  }

  return {
    get: () => cached,
    refresh,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async patchFileStatus(id, status) {
      const result = await apiFetch(`/api/files/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status },
        token: base.token() || undefined,
        origin: base.origin,
        fetchImpl: base.fetchImpl,
        refreshFn: base.refreshFn,
      });
      await refresh();
      return result;
    },
    async patchFileMeta(id, patch) {
      const result = await apiFetch(`/api/files/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch,
        token: base.token() || undefined,
        origin: base.origin,
        fetchImpl: base.fetchImpl,
        refreshFn: base.refreshFn,
      });
      await refresh();
      return result;
    },
    async saveMyPreferences(prefs) {
      const result = await apiFetch("/api/users/me/preferences", {
        method: "PATCH",
        body: prefs,
        token: base.token() || undefined,
        origin: base.origin,
        fetchImpl: base.fetchImpl,
        refreshFn: base.refreshFn,
      });
      await refresh();
      return result;
    },
    async setNotificationRead(notificationId, read) {
      const result = await apiFetch(
        `/api/users/me/notifications/${encodeURIComponent(notificationId)}`,
        {
          method: "PATCH",
          body: { read },
          token: base.token() || undefined,
          origin: base.origin,
          fetchImpl: base.fetchImpl,
          refreshFn: base.refreshFn,
        },
      );
      await refresh();
      return result;
    },
  };
}
