// @ts-check
/**
 * PaperHub ESM — modern async API layer (additive, non-breaking).
 *
 * Legacy `utils.js` uses synchronous XHR (`fetchDatasetSync`,
 * `sendAuthedSync`) + whole-dataset `PUT /api/dataset`. That model blocks the
 * main thread and is the target of Phase 2 removal.
 *
 * This module provides the async replacement side-by-side so pages can
 * migrate incrementally. It is fully testable in Node: pass `fetchImpl` and
 * `origin` explicitly in tests; in the browser the defaults
 * (`globalThis.fetch`, `window.location.origin`) apply.
 *
 * @typedef {typeof globalThis.fetch} FetchImpl
 */

/**
 * Build an absolute API URL from an app path.
 * @param {string} path e.g. "/api/dataset"
 * @param {string} [origin] defaults to window.location.origin in browser
 * @returns {string}
 */
export function paperhubApiUrl(path, origin) {
  const base =
    origin ??
    (typeof window !== "undefined" && window.location
      ? window.location.origin
      : "http://localhost");
  return new URL(path, base).href;
}

/**
 * @param {string} [token]
 * @returns {Record<string, string>}
 */
export function getAuthHeaders(token) {
  return token ? { Authorization: "Bearer " + token } : {};
}

/**
 * Async JSON API call with Bearer auth + single 401-refresh retry.
 *
 * Never touches localStorage directly — the caller supplies tokens, so this
 * works in pages, workers, and Node tests.
 *
 * @param {string} path
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {unknown} [options.body]
 * @param {string} [options.token]
 * @param {string} [options.origin]
 * @param {FetchImpl} [options.fetchImpl]
 * @param {() => Promise<string | null>} [options.refreshFn] called once on 401; should resolve to a new token or null
 * @returns {Promise<any>} parsed JSON (or text when non-JSON)
 * @throws {Error} displayable message from `{ error }` payload or HTTP status
 */
export async function apiFetch(
  path,
  { method = "GET", body, token, origin, fetchImpl, refreshFn } = {},
) {
  const doFetch = fetchImpl ?? (typeof globalThis.fetch !== "undefined" ? globalThis.fetch : null);
  if (!doFetch) throw new Error("fetch is not available");

  const url = paperhubApiUrl(path, origin);
  /** @type {Record<string, string>} */
  const headers = { ...getAuthHeaders(token) };
  /** @type {RequestInit} */
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response = await doFetch(url, init);

  if (response.status === 401 && typeof refreshFn === "function") {
    const nextToken = await refreshFn();
    if (nextToken) {
      const retryHeaders = { ...headers, ...getAuthHeaders(nextToken) };
      response = await doFetch(url, { ...init, headers: retryHeaders });
    }
  }

  const text = await response.text().catch(() => "");
  /** @type {any} */
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && data.error) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

/**
 * Convenience: GET JSON.
 * @param {string} path
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export function apiGet(path, options = {}) {
  return apiFetch(path, { ...options, method: "GET" });
}
