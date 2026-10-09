// @ts-check
/**
 * PaperHub ESM — pure formatting / escaping helpers.
 *
 * Strangler-fig Phase 1 of frontend modernization (Plan B):
 * canonical ESM source for logic that was previously only available as
 * shared-global functions in `public/assets/js/utils.js` (classic <script>).
 *
 * Implementations here are intentionally identical to the legacy versions so
 * pages can migrate one import at a time without behavior drift. New code
 * should `import { escapeHtml, ... } from "./format.mjs"` instead of relying
 * on globals. Legacy `utils.js` is unchanged at runtime.
 */

/**
 * Escape a value for safe interpolation into innerHTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format a date with tokens YYYY / MMM / DD / HH / mm / ss.
 * @param {string | number | Date} date
 * @param {string} [format="MMM DD, YYYY"]
 * @returns {string}
 */
export function formatDate(date, format = "MMM DD, YYYY") {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yyyy = d.getFullYear();
  const MM = months[d.getMonth()];
  const DD = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", yyyy)
    .replace("MMM", MM)
    .replace("DD", DD)
    .replace("HH", HH)
    .replace("mm", mm)
    .replace("ss", ss);
}

/**
 * @param {string | number | Date} date
 * @returns {string} "HH:MM" 24h
 */
export function formatTime(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * @param {string | number | Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return formatDate(date);
}

/**
 * @param {unknown} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(k))));
  return Math.round((value / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * @param {number} amount
 * @param {string} [currency="USD"]
 * @returns {string}
 */
export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * @param {unknown} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
