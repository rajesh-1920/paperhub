function getElement(selector) {
  return document.querySelector(selector);
}

function getElements(selector) {
  return document.querySelectorAll(selector);
}

function createElement(tag, className = "", id = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (id) element.id = id;
  return element;
}

function addClass(element, className) {
  if (element) element.classList.add(className);
}

function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

function hasClass(element, className) {
  return element && element.classList.contains(className);
}

function removeElement(element) {
  if (element) element.remove();
}

function showElement(element) {
  if (element) removeClass(element, "hidden");
}

function hideElement(element) {
  if (element) addClass(element, "hidden");
}

function addEvent(element, event, handler) {
  if (element) element.addEventListener(event, handler);
}

function removeEvent(element, event, handler) {
  if (element) element.removeEventListener(event, handler);
}

const PAPERHUB_APP_BASE_URL = (() => {
  const currentScript =
    document.currentScript ||
    Array.from(document.scripts || []).find(
      (script) => script.src && script.src.includes("/assets/js/utils.js"),
    );

  if (currentScript && currentScript.src) {
    return new URL("../../", currentScript.src).href;
  }

  return new URL("./", window.location.href).href;
})();

function resolveAppPath(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(normalizedPath, PAPERHUB_APP_BASE_URL).href;
}

const PAPERHUB_DATA_URL = resolveAppPath("assets/data/paperhub-backend.json");

/* ---------------------------------------------------------------------------
 * Data store — the JSON file is the database, served and persisted by the Node
 * backend (server/). The whole app reads through getPaperHubDataset() and
 * writes through the ph* mutators, so every action (upload, review decisions,
 * edits, settings) is saved to the JSON file and reflected on every page.
 *
 *   GET  /api/dataset  -> current dataset
 *   PUT  /api/dataset  -> persist the dataset (server writes the JSON file)
 *   POST /api/reset    -> restore the dataset from the pristine seed
 *
 * Reads/writes use synchronous XHR to preserve the app's synchronous data
 * model. If the API is unavailable, reads fall back to the static JSON file so
 * the UI still renders (read-only).
 * ------------------------------------------------------------------------- */

function paperhubApiUrl(path) {
  // The API lives at the server root, regardless of the current page's depth.
  return new URL(path, window.location.origin).href;
}

function fetchDatasetSync() {
  const sources = [paperhubApiUrl("/api/dataset"), PAPERHUB_DATA_URL];
  for (const url of sources) {
    try {
      const request = new XMLHttpRequest();
      request.open("GET", url, false);
      // Always pull a fresh copy — a browser-cached dataset would show stale
      // counts (e.g. an upload not reflected on the dashboard).
      request.setRequestHeader("Cache-Control", "no-cache");
      attachAuthHeader(request);
      request.send(null);
      if (request.status >= 200 && request.status < 300 && request.responseText) {
        return JSON.parse(request.responseText);
      }
    } catch (error) {
      /* try the next source */
    }
  }
  return {};
}

function getPaperHubDataset() {
  if (window.__paperhubDataset) {
    return window.__paperhubDataset;
  }

  window.__paperhubDataset = fetchDatasetSync();
  return window.__paperhubDataset;
}

// Drop the in-page cache and re-read the dataset from the server. Used when a
// page is restored from the back/forward cache so it never shows stale data.
function refreshPaperHubDataset() {
  delete window.__paperhubDataset;
  return getPaperHubDataset();
}

// When a write fails auth and the token can't be refreshed, the session is
// dead (e.g. a stale pre-auth token). Clear it and send the user to log in so
// they get a working token, instead of writes failing silently.
function handleSessionExpired() {
  try {
    if (/\/pages\/auth\//.test(window.location.pathname || "")) return;
  } catch (error) {
    return;
  }
  if (window.__paperhubSessionExpiring) return;
  window.__paperhubSessionExpiring = true;
  removeStorage(StorageKey.USER);
  removeStorage(StorageKey.USER_ROLE);
  removeStorage(StorageKey.TOKEN);
  removeStorage(StorageKey.REFRESH);
  try {
    if (typeof showError === "function") {
      showError("Your session has expired — please sign in again.");
    }
  } catch (error) {
    /* toast unavailable */
  }
  try {
    window.location.href = resolveAppPath("pages/auth/login.html");
  } catch (error) {
    /* navigation unavailable */
  }
}

// Send a synchronous, authenticated request; on a 401 refresh the access token
// once and retry. If it's still unauthorized, the session is dead → re-login.
function sendAuthedSync(method, url, { body = null, contentType = null } = {}) {
  const send = () => {
    const request = new XMLHttpRequest();
    request.open(method, url, false);
    if (contentType) {
      request.setRequestHeader("Content-Type", contentType);
    }
    attachAuthHeader(request);
    request.send(body);
    return request;
  };
  let request = send();
  if (request.status === 401 && refreshAccessTokenSync()) {
    request = send();
  }
  if (request.status === 401) {
    handleSessionExpired();
  }
  return request;
}

function persistPaperHubData() {
  try {
    const request = sendAuthedSync("PUT", paperhubApiUrl("/api/dataset"), {
      body: JSON.stringify(getPaperHubDataset()),
      contentType: "application/json",
    });
    if (request.status < 200 || request.status >= 300) {
      console.warn("Unable to persist PaperHub data: HTTP", request.status);
    }
  } catch (error) {
    console.warn("Unable to persist PaperHub data", error);
  }
  notifyPaperHubChange();
}

function resetPaperHubData() {
  try {
    sendAuthedSync("POST", paperhubApiUrl("/api/reset"));
  } catch (error) {
    console.warn("Unable to reset PaperHub data", error);
  }
  delete window.__paperhubDataset;
  notifyPaperHubChange();
}

/* ---------------------------------------------------------------------------
 * Live sync. Every write fires a `paperhub:change` event; the current page
 * registers a refresh via setPaperHubRefresh() so a status change re-renders
 * the open view immediately — no reload needed.
 * ------------------------------------------------------------------------- */

function notifyPaperHubChange() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("paperhub:change"));
  } catch (error) {
    /* CustomEvent unavailable — ignore */
  }
}

function setPaperHubRefresh(refresh) {
  if (typeof window !== "undefined") {
    window.__paperhubRefresh = typeof refresh === "function" ? refresh : null;
  }
}

if (typeof window !== "undefined" && !window.__paperhubSyncBound) {
  window.__paperhubSyncBound = true;
  window.addEventListener("paperhub:change", () => {
    if (typeof window.__paperhubRefresh === "function") {
      try {
        window.__paperhubRefresh();
      } catch (error) {
        console.warn("PaperHub refresh failed", error);
      }
    }
  });
}

function phFindUser(userId) {
  const dataset = getPaperHubDataset();
  return (dataset.users || []).find((user) => user.id === userId) || null;
}

function phMapReviewToFileStatus(status) {
  if (status === "completed" || status === "approved") return "completed";
  if (status === "rejected") return "rejected";
  if (status === "in-review" || status === "forwarded") return "reviewing";
  return "pending";
}

function phMapFileToReviewStatus(status) {
  if (status === "completed") return "completed";
  if (status === "rejected") return "rejected";
  if (status === "reviewing") return "in-review";
  return "pending";
}

/* ---------------------------------------------------------------------------
 * Cross-collection synchronization.
 * A document lives in dataset.files AND its owner's user.files; its review
 * lives in dataset.reviewQueue AND the owner's user.reviews. After a JSON round
 * trip these are separate objects, so a status change must touch every copy and
 * keep the file and its linked review consistent in BOTH directions, so the
 * change shows up the same on every page (files list, review queue/details,
 * dashboards).
 * ------------------------------------------------------------------------- */

function phApplyFileStatus(dataset, fileId, fileStatus) {
  (dataset.files || []).forEach((file) => {
    if (file.id === fileId) file.status = fileStatus;
  });
  (dataset.users || []).forEach((user) =>
    (user.files || []).forEach((file) => {
      if (file.id === fileId) file.status = fileStatus;
    }),
  );
}

function phApplyReviewStatus(dataset, reviewId, reviewStatus) {
  (dataset.reviewQueue || []).forEach((review) => {
    if (review.id === reviewId) review.status = reviewStatus;
  });
  (dataset.users || []).forEach((user) =>
    (user.reviews || []).forEach((review) => {
      if (review.id === reviewId) review.status = reviewStatus;
    }),
  );
}

// Resolve the file <-> review link from whichever id is known.
function phResolveLink(dataset, { fileId, reviewId }) {
  const queue = dataset.reviewQueue || [];
  let fid = fileId || null;
  let rid = reviewId || null;
  if (rid && !fid) {
    const match = queue.find((review) => review.id === rid);
    fid = (match && match.fileId) || fid;
  }
  if (fid && !rid) {
    const match = queue.find((review) => review.fileId === fid);
    rid = (match && match.id) || rid;
  }
  return { fid, rid };
}

// Keep the aggregate dashboard counters in step with the files.
function phRecomputeDashboardStats(dataset) {
  const files = dataset.files || [];
  dataset.dashboardStats = dataset.dashboardStats || {};
  dataset.dashboardStats.totalDocuments = files.length;
  dataset.dashboardStats.pendingReview = files.filter(
    (file) => file.status === "pending" || file.status === "reviewing",
  ).length;
  dataset.dashboardStats.processedDocuments = files.filter(
    (file) => file.status === "completed",
  ).length;

  // Keep each user's embedded dashboard.stats in sync with their own (active,
  // non-trashed) files, so non-dashboard pages that render user.dashboard.stats
  // — settings, profile — never show stale numbers.
  (dataset.users || []).forEach((user) => {
    const owned = (user.files || []).filter((file) => !file.deletedAt);
    if (!user.dashboard) user.dashboard = { description: "", stats: {} };
    if (!user.dashboard.stats) user.dashboard.stats = {};
    const stats = user.dashboard.stats;
    stats.totalSubmissions = owned.length;
    stats.pendingReview = owned.filter(
      (file) => file.status === "pending" || file.status === "reviewing",
    ).length;
    stats.approved = owned.filter((file) => file.status === "completed").length;
    stats.rejected = owned.filter((file) => file.status === "rejected").length;
  });
}

// Allowlists and limits guard the mutators against malformed input (e.g. an
// out-of-range status, an oversized name, or an empty comment) before anything
// is written to the persistent store.
const PH_REVIEW_STATUSES = [
  "pending",
  "in-review",
  "completed",
  "rejected",
  "approved",
  "forwarded",
];
const PH_FILE_STATUSES = ["pending", "reviewing", "completed", "rejected"];
const PH_MAX_NAME_LENGTH = 255;
const PH_MAX_COMMENT_LENGTH = 2000;

function phSanitizeName(name) {
  // Strip ASCII control characters (incl. NUL) then clamp length.
  // eslint-disable-next-line no-control-regex
  const stripped = String(name || "").replace(/[\u0000-\u001f\u007f]/g, "");
  return stripped.slice(0, PH_MAX_NAME_LENGTH);
}

function phAddFile(file, reviewItem) {
  const dataset = getPaperHubDataset();
  dataset.files = dataset.files || [];
  dataset.files.unshift(file);

  const owner = phFindUser(file.ownerId);
  if (owner) {
    owner.files = owner.files || [];
    owner.files.unshift(file);
  }

  if (reviewItem) {
    dataset.reviewQueue = dataset.reviewQueue || [];
    dataset.reviewQueue.unshift(reviewItem);
    if (owner) {
      owner.reviews = owner.reviews || [];
      owner.reviews.unshift(reviewItem);
    }
  }

  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phUpdateFileStatus(fileId, status) {
  if (!PH_FILE_STATUSES.includes(status)) return;
  const dataset = getPaperHubDataset();
  const { fid, rid } = phResolveLink(dataset, { fileId });
  if (fid) phApplyFileStatus(dataset, fid, status);
  if (rid) phApplyReviewStatus(dataset, rid, phMapFileToReviewStatus(status));
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phDeleteFile(fileId) {
  const dataset = getPaperHubDataset();
  dataset.files = (dataset.files || []).filter((file) => file.id !== fileId);
  (dataset.users || []).forEach((user) => {
    user.files = (user.files || []).filter((file) => file.id !== fileId);
    // Drop the matching review too, so a removed/rolled-back file can't keep
    // lingering on the review side while being gone from the files list.
    if (Array.isArray(user.reviews)) {
      user.reviews = user.reviews.filter((review) => review.fileId !== fileId);
    }
  });
  dataset.reviewQueue = (dataset.reviewQueue || []).filter((review) => review.fileId !== fileId);
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

// Stamp a file's real page count (from the server's PDF parse) onto every copy:
// the global file list, the owner's file list, and any matching review item.
function phSetFilePageCount(fileId, pageCount) {
  const pages = Number(pageCount) || 1;
  if (!fileId || pages < 1) return false;
  const dataset = getPaperHubDataset();
  let found = false;
  const setOnFile = (file) => {
    if (file && file.id === fileId) {
      file.pageCount = pages;
      found = true;
    }
  };
  (dataset.files || []).forEach(setOnFile);
  (dataset.users || []).forEach((user) => (user.files || []).forEach(setOnFile));
  const setOnReview = (review) => {
    if (review && review.fileId === fileId) review.pageCount = pages;
  };
  (dataset.reviewQueue || []).forEach(setOnReview);
  (dataset.users || []).forEach((user) => (user.reviews || []).forEach(setOnReview));
  if (found) persistPaperHubData();
  return found;
}

/* ---------------------------------------------------------------------------
 * Folders. Owner-scoped hierarchy with a materialized `path` for breadcrumbs
 * and search. Files reference a folder via file.folderId (null = root).
 * ------------------------------------------------------------------------- */

function phListFolders(ownerId) {
  const dataset = getPaperHubDataset();
  return (dataset.folders || []).filter(
    (folder) => !folder.deletedAt && (!ownerId || folder.ownerId === ownerId),
  );
}

function phGetFolder(folderId) {
  const dataset = getPaperHubDataset();
  return (dataset.folders || []).find((folder) => folder.id === folderId) || null;
}

// Materialized "/a/b/c" path for a folder given its parent and name.
function phComputeFolderPath(dataset, parentId, name) {
  if (!parentId) {
    return "/" + name;
  }
  const parent = (dataset.folders || []).find((folder) => folder.id === parentId);
  return (parent ? parent.path : "") + "/" + name;
}

// Recompute path for a folder and all of its descendants (after move/rename).
function phReindexFolderPaths(dataset, folderId) {
  const folders = dataset.folders || [];
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;
  folder.path = phComputeFolderPath(dataset, folder.parentId, folder.name);
  folders
    .filter((f) => f.parentId === folderId)
    .forEach((child) => {
      phReindexFolderPaths(dataset, child.id);
    });
}

function phAddFolder({ name, parentId = null, ownerId, color = null, description = "" } = {}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  const owner =
    ownerId || (typeof getCurrentUserData === "function" ? getCurrentUserData()?.id : null) || null;
  const folder = {
    id: generateId("folder"),
    name: cleanName,
    parentId: parentId || null,
    path: phComputeFolderPath(dataset, parentId, cleanName),
    ownerId: owner,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    color,
    description,
    acl: [],
    tagIds: [],
  };
  dataset.folders = dataset.folders || [];
  dataset.folders.push(folder);
  persistPaperHubData();
  return folder;
}

function phRenameFolder(folderId, newName) {
  const cleanName = String(newName || "").trim();
  if (!cleanName) return false;
  const dataset = getPaperHubDataset();
  const folder = (dataset.folders || []).find((f) => f.id === folderId);
  if (!folder) return false;
  folder.name = cleanName;
  folder.updatedAt = new Date().toISOString();
  phReindexFolderPaths(dataset, folder.id);
  persistPaperHubData();
  return true;
}

// Remove a folder, reparenting its subfolders and files to its parent so
// nothing is orphaned (the parent of a root folder is null = root).
function phDeleteFolder(folderId) {
  const dataset = getPaperHubDataset();
  const folders = dataset.folders || [];
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return false;
  const parentId = folder.parentId || null;

  folders
    .filter((f) => f.parentId === folderId)
    .forEach((child) => {
      child.parentId = parentId;
      phReindexFolderPaths(dataset, child.id);
    });

  const rehomeFiles = (list) =>
    (list || []).forEach((file) => {
      if (file.folderId === folderId) file.folderId = parentId;
    });
  rehomeFiles(dataset.files);
  (dataset.users || []).forEach((user) => rehomeFiles(user.files));

  dataset.folders = folders.filter((f) => f.id !== folderId);
  persistPaperHubData();
  return true;
}

// Rename a file across every copy (global list, owner's list, review queue).
function phRenameFile(fileId, newName) {
  const clean = String(newName || "").trim();
  if (!clean) return false;
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId) {
        file.name = clean;
        file.updatedAt = now;
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  const renameReview = (list) =>
    (list || []).forEach((review) => {
      if (review.fileId === fileId) review.documentName = clean;
    });
  renameReview(dataset.reviewQueue);
  (dataset.users || []).forEach((user) => renameReview(user.reviews));
  if (found) persistPaperHubData();
  return found;
}

// Move a file into a folder (null = root) across every copy.
function phMoveFile(fileId, folderId = null) {
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId) {
        file.folderId = folderId || null;
        file.updatedAt = now;
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

// Synchronously duplicate a file's stored bytes to a new id (server-side copy).
function copyFileContentSync(srcId, destId) {
  try {
    const request = new XMLHttpRequest();
    request.open("POST", paperhubApiUrl(`/api/files/${encodeURIComponent(srcId)}/copy`), false);
    request.setRequestHeader("Content-Type", "application/json");
    attachAuthHeader(request);
    request.send(JSON.stringify({ targetId: destId }));
    if (request.status === 401 && refreshAccessTokenSync()) {
      return copyFileContentSync(srcId, destId);
    }
    return request.status >= 200 && request.status < 300;
  } catch (error) {
    return false;
  }
}

function phCopyName(name) {
  const value = String(name || "file");
  const dot = value.lastIndexOf(".");
  if (dot > 0) {
    return `${value.slice(0, dot)} (copy)${value.slice(dot)}`;
  }
  return `${value} (copy)`;
}

// Duplicate a file (new id + duplicated binary) into a target folder.
function phCopyFile(fileId, targetFolderId = null) {
  const dataset = getPaperHubDataset();
  const source = (dataset.files || []).find((file) => file.id === fileId);
  if (!source) return null;
  const now = new Date().toISOString();
  const newId = generateId("file");
  const copy = {
    ...source,
    id: newId,
    name: phCopyName(source.name),
    folderId: targetFolderId !== undefined ? targetFolderId : (source.folderId ?? null),
    uploadedAt: now,
    updatedAt: now,
  };
  if (source.hasContent) {
    copyFileContentSync(fileId, newId);
  }
  dataset.files = dataset.files || [];
  dataset.files.unshift(copy);
  const owner = phFindUser(source.ownerId);
  if (owner) {
    owner.files = owner.files || [];
    owner.files.unshift(copy);
  }
  if (typeof phRecomputeDashboardStats === "function") {
    phRecomputeDashboardStats(dataset);
  }
  persistPaperHubData();
  return copy;
}

/* ---------------------------------------------------------------------------
 * Version history. Each file keeps versions[] {versionId, contentRef, number,
 * versionLabel, size, uploadedAt, uploadedByName, changeNote}; currentVersion
 * points at the live one. The binary for a version lives at its contentRef.
 * ------------------------------------------------------------------------- */

function phListVersions(fileId) {
  const file = (getPaperHubDataset().files || []).find((f) => f.id === fileId);
  if (!file) return [];
  if (Array.isArray(file.versions) && file.versions.length) {
    return file.versions;
  }
  // Legacy file with content but no history: present its current content as v1.
  if (file.hasContent) {
    return [
      {
        versionId: "v1",
        contentRef: file.id,
        number: 1,
        versionLabel: "v1",
        size: file.size || 0,
        sizeLabel: file.sizeLabel || formatFileSize(file.size || 0),
        uploadedAt: file.uploadedAt,
        uploadedByName: file.ownerName || null,
        changeNote: "Original upload",
        current: true,
      },
    ];
  }
  return [];
}

function phAddFileVersion(fileId, meta = {}) {
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id !== fileId) return;
      file.versions = file.versions || [];
      const number = file.versions.length + 1;
      const entry = {
        versionId: meta.versionId,
        contentRef: meta.contentRef || `${fileId}__${meta.versionId}`,
        number,
        versionLabel: meta.versionLabel || `v${number}`,
        size: Number(meta.size || 0),
        sizeLabel: formatFileSize(Number(meta.size || 0)),
        uploadedAt: now,
        uploadedBy: meta.uploadedBy || null,
        uploadedByName: meta.uploadedByName || null,
        changeNote: meta.changeNote || "",
        pageCount: meta.pageCount || 1,
      };
      file.versions.push(entry);
      file.currentVersion = entry.versionId;
      file.versionCount = file.versions.length;
      file.size = entry.size || file.size;
      file.sizeLabel = entry.sizeLabel || file.sizeLabel;
      file.updatedAt = now;
      file.hasContent = true;
      found = true;
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

// Revert a file to an earlier version: copy that version's archived binary back
// to the live content and point currentVersion at it (history is unchanged).
function phRestoreVersion(fileId, versionId) {
  const dataset = getPaperHubDataset();
  const file = (dataset.files || []).find((f) => f.id === fileId);
  if (!file) return false;
  const version = (file.versions || []).find((v) => v.versionId === versionId);
  if (!version) return false;

  if (
    version.contentRef &&
    version.contentRef !== fileId &&
    typeof copyFileContentSync === "function"
  ) {
    copyFileContentSync(version.contentRef, fileId);
  }
  const now = new Date().toISOString();
  const apply = (list) =>
    (list || []).forEach((f) => {
      if (f.id !== fileId) return;
      f.currentVersion = versionId;
      if (version.size) {
        f.size = version.size;
        f.sizeLabel = version.sizeLabel || formatFileSize(version.size);
      }
      f.updatedAt = now;
      f.hasContent = true;
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  persistPaperHubData();
  return true;
}

/* ---------------------------------------------------------------------------
 * Access control (ACL). Files and folders carry an acl[] of grants:
 *   { principalType: "user"|"role"|"team", principalId, permission, grantedBy,
 *     grantedAt, expiresAt }
 * Enforcement is server-side (server/auth/ownership.js); these mutators just
 * maintain the grants.
 * ------------------------------------------------------------------------- */

const PH_PERMISSIONS = ["view", "comment", "edit", "owner"];
const PH_PRINCIPAL_TYPES = ["user", "role", "team"];

function phNormalizeGrant(grant) {
  if (!grant || !PH_PRINCIPAL_TYPES.includes(grant.principalType) || !grant.principalId) {
    return null;
  }
  const permission = PH_PERMISSIONS.includes(grant.permission) ? grant.permission : "view";
  return {
    principalType: grant.principalType,
    principalId: String(grant.principalId),
    permission,
    grantedBy:
      grant.grantedBy ||
      (typeof getCurrentUserData === "function" ? getCurrentUserData()?.id : null) ||
      null,
    grantedAt: grant.grantedAt || new Date().toISOString(),
    expiresAt: grant.expiresAt || null,
  };
}

function phUpsertGrant(acl, entry) {
  const next = (acl || []).filter(
    (g) => !(g.principalType === entry.principalType && g.principalId === entry.principalId),
  );
  next.push(entry);
  return next;
}

function phGrantFileAccess(fileId, grant) {
  const entry = phNormalizeGrant(grant);
  if (!entry) return false;
  const dataset = getPaperHubDataset();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId) {
        file.acl = phUpsertGrant(file.acl, entry);
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

function phRevokeFileAccess(fileId, principalType, principalId) {
  const dataset = getPaperHubDataset();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId && Array.isArray(file.acl)) {
        file.acl = file.acl.filter(
          (g) => !(g.principalType === principalType && g.principalId === String(principalId)),
        );
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

function phListFileGrants(fileId) {
  const file = (getPaperHubDataset().files || []).find((f) => f.id === fileId);
  return file && Array.isArray(file.acl) ? file.acl : [];
}

function phGrantFolderAccess(folderId, grant) {
  const entry = phNormalizeGrant(grant);
  if (!entry) return false;
  const dataset = getPaperHubDataset();
  const folder = (dataset.folders || []).find((f) => f.id === folderId);
  if (!folder) return false;
  folder.acl = phUpsertGrant(folder.acl, entry);
  persistPaperHubData();
  return true;
}

function phRevokeFolderAccess(folderId, principalType, principalId) {
  const dataset = getPaperHubDataset();
  const folder = (dataset.folders || []).find((f) => f.id === folderId);
  if (!folder || !Array.isArray(folder.acl)) return false;
  folder.acl = folder.acl.filter(
    (g) => !(g.principalType === principalType && g.principalId === String(principalId)),
  );
  persistPaperHubData();
  return true;
}

function phListFolderGrants(folderId) {
  const folder = (getPaperHubDataset().folders || []).find((f) => f.id === folderId);
  return folder && Array.isArray(folder.acl) ? folder.acl : [];
}

// --- Shareable links (server-side; tokens never live in the dataset read) ---

async function phShareApi(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = "Bearer " + token;
  const response = await fetch(paperhubApiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Share request failed");
  }
  return data;
}

function createShareLinkViaApi(resourceType, resourceId, options = {}) {
  return phShareApi("POST", "/api/share", { resourceType, resourceId, ...options });
}

function revokeShareLinkViaApi(token) {
  return phShareApi("DELETE", `/api/share/${encodeURIComponent(token)}`);
}

function listMyShareLinksViaApi() {
  return phShareApi("GET", "/api/share/mine");
}

// Record a user action in the server-side audit log (best-effort, non-blocking).
// The server stamps the verified actor; the client only supplies the action.
function logActivityViaApi(action, details = {}) {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = getAuthToken();
    if (token) headers.Authorization = "Bearer " + token;
    fetch(paperhubApiUrl("/api/audit"), {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...details }),
    }).catch(() => {});
  } catch (error) {
    /* activity logging is best-effort */
  }
}

function listActivityViaApi(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const headers = {};
  const token = getAuthToken();
  if (token) headers.Authorization = "Bearer " + token;
  return fetch(paperhubApiUrl(`/api/audit${qs ? `?${qs}` : ""}`), { headers }).then((r) =>
    r.ok ? r.json() : { items: [], total: 0 },
  );
}

// Absolute URL a recipient opens to view a shared resource.
function shareLinkUrl(token) {
  return new URL(
    `/pages/share/view.html?token=${encodeURIComponent(token)}`,
    window.location.origin,
  ).href;
}

/* ---------------------------------------------------------------------------
 * Teams. A team groups members and can be used as an ACL principal so a whole
 * group is granted access to a file/folder at once.
 * ------------------------------------------------------------------------- */

function phListTeams() {
  return getPaperHubDataset().teams || [];
}

function phGetTeam(teamId) {
  return (getPaperHubDataset().teams || []).find((t) => t.id === teamId) || null;
}

function phListMyTeams(userId) {
  return (getPaperHubDataset().teams || []).filter(
    (t) => t.ownerId === userId || (t.members || []).some((m) => m.userId === userId),
  );
}

function phCreateTeam({ name, ownerId } = {}) {
  const clean = String(name || "").trim();
  if (!clean) return null;
  const dataset = getPaperHubDataset();
  const owner =
    ownerId || (typeof getCurrentUserData === "function" ? getCurrentUserData()?.id : null) || null;
  const team = {
    id: generateId("team"),
    name: clean,
    ownerId: owner,
    createdAt: new Date().toISOString(),
    members: owner ? [{ userId: owner, role: "manager" }] : [],
  };
  dataset.teams = dataset.teams || [];
  dataset.teams.push(team);
  persistPaperHubData();
  return team;
}

function phAddTeamMember(teamId, userId, role = "member") {
  const team = phGetTeam(teamId);
  if (!team || !userId) return false;
  team.members = team.members || [];
  const existing = team.members.find((m) => m.userId === userId);
  if (existing) existing.role = role;
  else team.members.push({ userId, role: role === "manager" ? "manager" : "member" });
  persistPaperHubData();
  return true;
}

function phRemoveTeamMember(teamId, userId) {
  const team = phGetTeam(teamId);
  if (!team || !Array.isArray(team.members)) return false;
  team.members = team.members.filter((m) => m.userId !== userId);
  persistPaperHubData();
  return true;
}

function phDeleteTeam(teamId) {
  const dataset = getPaperHubDataset();
  const before = (dataset.teams || []).length;
  dataset.teams = (dataset.teams || []).filter((t) => t.id !== teamId);
  if ((dataset.teams || []).length !== before) {
    persistPaperHubData();
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------------------
 * Bulk file actions (used by the multi-select toolbar). Each applies to every
 * copy of the affected files and persists once.
 * ------------------------------------------------------------------------- */

function phMoveFiles(ids, folderId = null) {
  const set = new Set(ids || []);
  if (!set.size) return;
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (set.has(file.id)) {
        file.folderId = folderId || null;
        file.updatedAt = now;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  persistPaperHubData();
}

function phTagFiles(ids, tagId) {
  const set = new Set(ids || []);
  if (!set.size || !tagId) return;
  const dataset = getPaperHubDataset();
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (set.has(file.id)) {
        file.tagIds = file.tagIds || [];
        if (!file.tagIds.includes(tagId)) file.tagIds.push(tagId);
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  persistPaperHubData();
}

function phDeleteFiles(ids) {
  const set = new Set(ids || []);
  if (!set.size) return;
  const dataset = getPaperHubDataset();
  dataset.files = (dataset.files || []).filter((file) => !set.has(file.id));
  (dataset.users || []).forEach((user) => {
    user.files = (user.files || []).filter((file) => !set.has(file.id));
  });
  dataset.reviewQueue = (dataset.reviewQueue || []).filter((review) => !set.has(review.fileId));
  if (typeof phRecomputeDashboardStats === "function") {
    phRecomputeDashboardStats(dataset);
  }
  persistPaperHubData();
}

/* ---------------------------------------------------------------------------
 * Trash. Deleting a file soft-deletes it (deletedAt/deletedBy) — the record and
 * its binary are retained until an explicit purge. Search/active views exclude
 * deletedAt; phListTrash surfaces them for restore or permanent deletion.
 * ------------------------------------------------------------------------- */

function phTrashFiles(ids, deletedBy) {
  const set = new Set(ids || []);
  if (!set.size) return 0;
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  const by =
    deletedBy ||
    (typeof getCurrentUserData === "function" ? getCurrentUserData()?.id : null) ||
    null;
  let count = 0;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (set.has(file.id) && !file.deletedAt) {
        file.deletedAt = now;
        file.deletedBy = by;
        count++;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (typeof phRecomputeDashboardStats === "function") phRecomputeDashboardStats(dataset);
  persistPaperHubData();
  return count;
}

function phTrashFile(fileId, deletedBy) {
  return phTrashFiles([fileId], deletedBy) > 0;
}

function phRestoreFile(fileId) {
  const dataset = getPaperHubDataset();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId && file.deletedAt) {
        delete file.deletedAt;
        delete file.deletedBy;
        file.updatedAt = new Date().toISOString();
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) {
    if (typeof phRecomputeDashboardStats === "function") phRecomputeDashboardStats(dataset);
    persistPaperHubData();
  }
  return found;
}

function phListTrash(ownerId) {
  return (getPaperHubDataset().files || []).filter(
    (f) => f.deletedAt && (!ownerId || f.ownerId === ownerId),
  );
}

// Storage usage for a user: bytes used by non-trashed owned files vs the limit.
// Unlimited by default (Number.MAX_SAFE_INTEGER) — only an explicit
// user.storage.limitBytes or meta.quotaDefaults.limitBytes caps the user.
function phStorageUsage(userId) {
  const dataset = getPaperHubDataset();
  const owner = (dataset.users || []).find((u) => u.id === userId);
  const files = (dataset.files || []).filter((f) => f.ownerId === userId && !f.deletedAt);
  const usedBytes = files.reduce((sum, f) => sum + Number(f.size || 0), 0);
  const limitBytes = Number(
    owner && owner.storage && owner.storage.limitBytes != null
      ? owner.storage.limitBytes
      : (dataset.meta && dataset.meta.quotaDefaults && dataset.meta.quotaDefaults.limitBytes) ||
          Number.MAX_SAFE_INTEGER,
  );
  return {
    usedBytes,
    limitBytes,
    fileCount: files.length,
    percent: limitBytes ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0,
  };
}

// Permanently remove files. The record is dropped (its binary is reclaimed by
// the server's orphan prune on the next write).
function phPurgeFiles(ids) {
  return phDeleteFiles(ids);
}

function phPurgeFile(fileId) {
  return phDeleteFiles([fileId]);
}

/* ---------------------------------------------------------------------------
 * Tags. A normalized tags[] table referenced by file.tagIds / folder.tagIds.
 * The legacy free-text file.tags[] is left untouched.
 * ------------------------------------------------------------------------- */

function phTagSlug(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function phListTags() {
  return getPaperHubDataset().tags || [];
}

// Create a tag, or return the existing one with the same slug (idempotent).
function phCreateTag({ label, color = null, createdBy = null } = {}) {
  const clean = String(label || "").trim();
  if (!clean) return null;
  const slug = phTagSlug(clean);
  if (!slug) return null;
  const dataset = getPaperHubDataset();
  dataset.tags = dataset.tags || [];
  const existing = dataset.tags.find((t) => t.slug === slug);
  if (existing) return existing;
  const tag = {
    id: generateId("tag"),
    label: clean,
    slug,
    color,
    createdBy:
      createdBy ||
      (typeof getCurrentUserData === "function" ? getCurrentUserData()?.id : null) ||
      null,
    createdAt: new Date().toISOString(),
  };
  dataset.tags.push(tag);
  persistPaperHubData();
  return tag;
}

// Resolve a file's/folder's tagIds to tag objects.
function phResolveTags(tagIds) {
  const tags = getPaperHubDataset().tags || [];
  return (tagIds || []).map((id) => tags.find((t) => t.id === id)).filter(Boolean);
}

function phTagFile(fileId, tagId) {
  const dataset = getPaperHubDataset();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId) {
        file.tagIds = file.tagIds || [];
        if (!file.tagIds.includes(tagId)) file.tagIds.push(tagId);
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

function phUntagFile(fileId, tagId) {
  const dataset = getPaperHubDataset();
  let found = false;
  const apply = (list) =>
    (list || []).forEach((file) => {
      if (file.id === fileId && Array.isArray(file.tagIds)) {
        file.tagIds = file.tagIds.filter((t) => t !== tagId);
        found = true;
      }
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  if (found) persistPaperHubData();
  return found;
}

function phTagFolder(folderId, tagId) {
  const dataset = getPaperHubDataset();
  const folder = (dataset.folders || []).find((f) => f.id === folderId);
  if (!folder) return false;
  folder.tagIds = folder.tagIds || [];
  if (!folder.tagIds.includes(tagId)) {
    folder.tagIds.push(tagId);
    persistPaperHubData();
  }
  return true;
}

function phUntagFolder(folderId, tagId) {
  const dataset = getPaperHubDataset();
  const folder = (dataset.folders || []).find((f) => f.id === folderId);
  if (!folder || !Array.isArray(folder.tagIds)) return false;
  folder.tagIds = folder.tagIds.filter((t) => t !== tagId);
  persistPaperHubData();
  return true;
}

function phUpdateUser(userId, patch) {
  const dataset = getPaperHubDataset();
  const user = phFindUser(userId);
  if (user) {
    Object.assign(user, patch);
  }
  const account = (dataset.authAccounts || []).find((entry) => entry.id === userId);
  if (account) {
    if (patch.name) account.name = patch.name;
    if (patch.email) account.email = String(patch.email).toLowerCase();
    if (patch.title) account.title = patch.title;
    if (patch.role) account.role = patch.role;
  }
  persistPaperHubData();
  return user;
}

function phAddUser(account, profile) {
  const dataset = getPaperHubDataset();
  dataset.authAccounts = dataset.authAccounts || [];
  dataset.users = dataset.users || [];
  dataset.authAccounts.push(account);
  dataset.users.push(profile);
  persistPaperHubData();
}

// Permanently remove a user: their auth account and profile, plus everything
// they own (files, folders, review-queue items, share links) so no orphaned
// records are left pointing at a user that no longer exists. Also scrubs the
// removed user's files/reviews from any OTHER user's embedded copies (e.g. an
// officer's review list). Returns true if a matching user/account was removed.
function phRemoveUser(userId) {
  if (!userId) return false;
  const dataset = getPaperHubDataset();
  const existed =
    (dataset.users || []).some((u) => u.id === userId) ||
    (dataset.authAccounts || []).some((a) => a.id === userId);
  if (!existed) return false;

  const ownedFileIds = new Set(
    (dataset.files || []).filter((f) => f.ownerId === userId).map((f) => f.id),
  );

  dataset.authAccounts = (dataset.authAccounts || []).filter((a) => a.id !== userId);
  dataset.users = (dataset.users || []).filter((u) => u.id !== userId);
  dataset.files = (dataset.files || []).filter((f) => f.ownerId !== userId);
  dataset.folders = (dataset.folders || []).filter((f) => f.ownerId !== userId);
  dataset.reviewQueue = (dataset.reviewQueue || []).filter((r) => !ownedFileIds.has(r.fileId));
  dataset.shareLinks = (dataset.shareLinks || []).filter(
    (s) => s.createdBy !== userId && !ownedFileIds.has(s.fileId),
  );

  // Drop any lingering references to the removed user's files from the
  // remaining users' embedded file/review copies.
  (dataset.users || []).forEach((user) => {
    if (Array.isArray(user.files)) {
      user.files = user.files.filter((f) => !ownedFileIds.has(f.id));
    }
    if (Array.isArray(user.reviews)) {
      user.reviews = user.reviews.filter((r) => !ownedFileIds.has(r.fileId));
    }
  });

  if (typeof phRecomputeDashboardStats === "function") phRecomputeDashboardStats(dataset);
  persistPaperHubData();
  return true;
}

function phSetReviewStatus(reviewId, status) {
  if (!PH_REVIEW_STATUSES.includes(status)) return;
  const dataset = getPaperHubDataset();
  const { fid, rid } = phResolveLink(dataset, { reviewId });
  if (rid) phApplyReviewStatus(dataset, rid, status);
  if (fid) phApplyFileStatus(dataset, fid, phMapReviewToFileStatus(status));
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phAddReviewComment(reviewId, comment) {
  const text = String(comment?.text || "").trim();
  if (!text) return;
  const safeComment = { ...comment, text: text.slice(0, PH_MAX_COMMENT_LENGTH) };
  const dataset = getPaperHubDataset();
  const push = (review) => {
    review.comments = review.comments || [];
    review.comments.push(safeComment);
  };
  (dataset.reviewQueue || []).forEach((review) => {
    if (review.id === reviewId) push(review);
  });
  (dataset.users || []).forEach((user) =>
    (user.reviews || []).forEach((review) => {
      if (review.id === reviewId) push(review);
    }),
  );
  persistPaperHubData();
}

function phSetNotificationRead(userId, notificationId, read = true) {
  const user = phFindUser(userId);
  if (user) {
    (user.notifications || []).forEach((notification) => {
      if (String(notification.id) === String(notificationId)) notification.read = read;
    });
  }
  persistPaperHubData();
}

function phMarkAllNotificationsRead(userId) {
  const user = phFindUser(userId);
  if (user) {
    (user.notifications || []).forEach((notification) => {
      notification.read = true;
    });
  }
  persistPaperHubData();
}

function phSaveUserPreferences(userId, prefs) {
  const user = phFindUser(userId);
  if (user) {
    user.preferences = Object.assign({}, user.preferences, prefs);
    if (prefs.language) user.language = prefs.language;
    if (prefs.timezone) user.timezone = prefs.timezone;
  }
  persistPaperHubData();
}

function phSetPaymentStatus(userId, status) {
  const user = phFindUser(userId);
  if (user && user.payment) {
    user.payment.status = status;
    user.payment.lastUpdated = formatDate(new Date(), "DD MMM YYYY, HH:mm");
  }
  persistPaperHubData();
}

// Password changes go through POST /api/auth/change-password
// (changePasswordViaApi) — credentials are never stored or compared in the
// browser.

// Mark a file as freshly updated (used by "Restore version"); bumps it to the
// top of the most-recent ordering everywhere it appears.
function phTouchFile(fileId) {
  const dataset = getPaperHubDataset();
  const now = new Date().toISOString();
  const apply = (files) =>
    (files || []).forEach((file) => {
      if (file.id === fileId) file.updatedAt = now;
    });
  apply(dataset.files);
  (dataset.users || []).forEach((user) => apply(user.files));
  persistPaperHubData();
}

function showToast(message, type = "info", duration = 3000) {
  const container = getOrCreateToastContainer();
  const toastId = "toast-" + Date.now();

  const toastClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  };

  const toast = createElement(
    "div",
    `toast ${toastClasses[type] || toastClasses.info} text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in`,
    toastId,
  );
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    fadeOut(toast, () => removeElement(toast));
  }, duration);

  return toastId;
}

function getOrCreateToastContainer() {
  let container = getElement("#toast-container");
  if (!container) {
    container = createElement(
      "div",
      "fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm",
      "toast-container",
    );
    // Announce toasts to assistive tech as they appear.
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
  }
  return container;
}

function showSuccess(message, duration = 3000) {
  return showToast(message, "success", duration);
}

function showError(message, duration = 3000) {
  return showToast(message, "error", duration);
}

function showWarning(message, duration = 3000) {
  return showToast(message, "warning", duration);
}

function showInfo(message, duration = 3000) {
  return showToast(message, "info", duration);
}

function fadeIn(element, duration = 300) {
  element.style.opacity = "0";
  element.style.transition = `opacity ${duration}ms ease-in`;
  setTimeout(() => {
    element.style.opacity = "1";
  }, 10);
}

function fadeOut(element, callback, duration = 300) {
  element.style.opacity = "1";
  element.style.transition = `opacity ${duration}ms ease-out`;
  element.style.opacity = "0";
  setTimeout(() => {
    if (callback) callback();
  }, duration);
}

const StorageKey = {
  USER: "paperhub-user",
  USER_ROLE: "paperhub-user-role",
  THEME: "paperhub-theme",
  PREFERENCES: "paperhub-preferences",
  TOKEN: "paperhub-auth-token",
  REFRESH: "paperhub-refresh-token",
};

// The current access token (sent as a Bearer header on API calls), or "".
function getAuthToken() {
  const token = getStorage(StorageKey.TOKEN, "");
  return typeof token === "string" ? token : "";
}

// Attach the bearer token to an open XHR (no-op when signed out).
function attachAuthHeader(request) {
  const token = getAuthToken();
  if (token) {
    request.setRequestHeader("Authorization", "Bearer " + token);
  }
}

// Exchange the stored refresh token for a fresh access token (synchronously, so
// the sync-XHR data layer can retry a 401 in place). Returns true on success.
function refreshAccessTokenSync() {
  try {
    const refreshToken = getStorage(StorageKey.REFRESH, "");
    if (!refreshToken) {
      return false;
    }
    const request = new XMLHttpRequest();
    request.open("POST", paperhubApiUrl("/api/auth/refresh"), false);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify({ refreshToken }));
    if (request.status >= 200 && request.status < 300) {
      const data = JSON.parse(request.responseText || "{}");
      if (data.token) {
        setStorage(StorageKey.TOKEN, data.token);
        // If the server ever rotates the refresh token, keep the new one so the
        // next refresh doesn't fail on a stale token.
        if (data.refreshToken) {
          setStorage(StorageKey.REFRESH, data.refreshToken);
        }
        return true;
      }
    }
  } catch (error) {
    /* refresh failed — caller proceeds unauthenticated */
  }
  return false;
}

// Rotate the signed-in user's password through the server (credentials never
// live in the browser). Resolves on success, throws a displayable message.
async function changePasswordViaApi(currentPassword, newPassword) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  const response = await fetch(paperhubApiUrl("/api/auth/change-password"), {
    method: "POST",
    headers,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not change password");
  }
  return data;
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function getStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch (parseError) {
      return value;
    }
  } catch (error) {
    console.error("Storage error:", error);
    return defaultValue;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function setCurrentUser(user) {
  setStorage(StorageKey.USER, user);
  setStorage(StorageKey.USER_ROLE, user.role);
}

function getCurrentUser() {
  return getStorage(StorageKey.USER);
}

function getCurrentUserRole() {
  return getStorage(StorageKey.USER_ROLE, "user");
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function hasRole(role) {
  const currentRole = getCurrentUserRole();
  return typeof role === "string" ? currentRole === role : role.includes(currentRole);
}

function logout() {
  // Best-effort server-side revocation of the refresh token.
  try {
    const refreshToken = getStorage(StorageKey.REFRESH, "");
    if (refreshToken) {
      const request = new XMLHttpRequest();
      request.open("POST", paperhubApiUrl("/api/auth/logout"), false);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(JSON.stringify({ refreshToken }));
    }
  } catch (error) {
    /* best effort — clear the local session regardless */
  }
  removeStorage(StorageKey.USER);
  removeStorage(StorageKey.USER_ROLE);
  removeStorage(StorageKey.TOKEN);
  removeStorage(StorageKey.REFRESH);
  window.location.href = resolveAppPath("pages/auth/login.html");
}

function setTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }

  try {
    localStorage.setItem(StorageKey.THEME, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Storage error:", error);
  }
}

function getTheme() {
  const stored = getStorage(StorageKey.THEME);
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function toggleTheme() {
  const isDark = !getTheme();
  setTheme(isDark);
  return isDark;
}

function initializeTheme() {
  const isDark = getTheme();
  setTheme(isDark);
}

function formatDate(date, format = "MMM DD, YYYY") {
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

function formatTime(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeAgo(date) {
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

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 8;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(k))));
  return Math.round((value / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showSuccess("Copied to clipboard!");
    })
    .catch(() => {
      showError("Failed to copy to clipboard");
    });
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function redirect(url, delay = 0) {
  if (delay > 0) {
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  } else {
    window.location.href = url;
  }
}

function reloadPage() {
  window.location.reload();
}

function goBack() {
  window.history.back();
}

function getCurrentPage() {
  return window.location.pathname;
}

function getQueryParam(param) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(param);
}

function getAllQueryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
});

async function apiCall(endpoint) {
  const delay = 500;

  return new Promise((resolve) => {
    setTimeout(() => {
      const dataset = typeof getPaperHubDataset === "function" ? getPaperHubDataset() : {};
      const mockResponses = {
        "/api/dashboard/stats": {
          success: true,
          data: dataset.dashboardStats || {},
        },
        "/api/files": {
          success: true,
          data: Array.isArray(dataset.files) ? dataset.files : [],
        },
      };

      resolve(mockResponses[endpoint] || { success: true, data: {} });
    }, delay);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRole(role) {
  const safeRole = String(role || "user").toLowerCase();

  if (safeRole === "admin") return "admin";
  if (safeRole === "teacher" || safeRole === "officer") return "officer";
  if (safeRole === "student" || safeRole === "user") return "user";
  return "user";
}

const PAPERHUB_ROLE_STORAGE_KEY = "paperhub-role";
const PAPERHUB_CURRENT_USER_STORAGE_KEY = "paperhub-current-user-id";

// Always read users from the live dataset so additions (admin add-user) and
// any array replacement by the ph* mutators are reflected, including after
// SPA-style navigation. Capturing the array once would go stale.
function getMockUsers() {
  const dataset = getPaperHubDataset();
  return Array.isArray(dataset.users) ? dataset.users : [];
}

function getDashboardRole(role) {
  return normalizeRole(role);
}

function getDashboardRouteForRole(role) {
  const dashboardRole = getDashboardRole(role);
  return resolveAppPath(`pages/dashboard/${dashboardRole}.html`);
}

function getDashboardRouteForUser(user) {
  return getDashboardRouteForRole(user?.role || "user");
}

function getMockUserById(userId) {
  const value = String(userId || "");
  return getMockUsers().find((user) => user.id === value) || null;
}

function getMockUserByIdentity(user) {
  if (!user) {
    return null;
  }

  const id = String(user.id || "").trim();
  const email = String(user.email || "")
    .trim()
    .toLowerCase();
  const name = String(user.name || "")
    .trim()
    .toLowerCase();

  return (
    getMockUsers().find((candidate) => candidate.id === id) ||
    getMockUsers().find(
      (candidate) =>
        String(candidate.email || "")
          .trim()
          .toLowerCase() === email,
    ) ||
    getMockUsers().find(
      (candidate) =>
        String(candidate.name || "")
          .trim()
          .toLowerCase() === name,
    ) ||
    null
  );
}

function getDefaultUserForRole(role) {
  const normalizedRole = normalizeRole(role);
  return getMockUsers().find((user) => user.role === normalizedRole) || null;
}

function setStoredRole(role) {
  const normalizedRole = normalizeRole(role);
  try {
    localStorage.setItem(PAPERHUB_ROLE_STORAGE_KEY, normalizedRole);
  } catch (error) {
    console.warn("Unable to persist role", error);
  }
  return normalizedRole;
}

function getStoredRole() {
  try {
    const storedRole = localStorage.getItem(PAPERHUB_ROLE_STORAGE_KEY);
    if (storedRole) {
      return normalizeRole(storedRole);
    }

    return normalizeRole(localStorage.getItem(StorageKey.USER_ROLE));
  } catch (error) {
    return "user";
  }
}

function setCurrentUserById(userId) {
  const selectedUser = getMockUserById(userId);
  const nextUser = selectedUser || getDefaultUserForRole(getStoredRole());

  if (!nextUser) {
    return null;
  }

  try {
    localStorage.setItem(PAPERHUB_CURRENT_USER_STORAGE_KEY, nextUser.id);
  } catch (error) {
    console.warn("Unable to persist current user", error);
  }

  if (typeof setCurrentUser === "function") {
    setCurrentUser(nextUser);
  }

  setStoredRole(nextUser.role);
  return nextUser;
}

function getCurrentUserData() {
  const authUser = getCurrentUser();
  if (authUser && authUser.name && authUser.email) {
    const matchedUser = getMockUserByIdentity(authUser);
    const datasetUser = matchedUser || getDefaultUserForRole(authUser.role);
    if (datasetUser) {
      if (matchedUser) {
        return {
          ...datasetUser,
          ...authUser,
          role: normalizeRole(datasetUser.role || authUser.role),
        };
      }

      return {
        ...datasetUser,
        role: normalizeRole(datasetUser.role || authUser.role),
      };
    }

    return {
      ...authUser,
      role: normalizeRole(authUser.role),
    };
  }

  try {
    const savedUserId = localStorage.getItem(PAPERHUB_CURRENT_USER_STORAGE_KEY);
    const selectedUser = getMockUserById(savedUserId);
    if (selectedUser) {
      setStoredRole(selectedUser.role);
      return selectedUser;
    }
  } catch (error) {
    console.warn("Unable to read current user", error);
  }

  const fallbackUser = getDefaultUserForRole(getStoredRole());
  if (!fallbackUser) {
    return null;
  }
  setCurrentUserById(fallbackUser.id);
  return fallbackUser;
}

function getCurrentUserFiles() {
  const user = getCurrentUserData();
  if (!user) return [];
  // The global dataset.files is the source of truth — an upload always lands
  // there (phAddFile writes it unconditionally), whereas the embedded user.files
  // copy is only updated when the owner is resolved. Union the two by id so a
  // freshly uploaded file can never go missing from the files page.
  const byId = new Map();
  if (Array.isArray(user.files)) {
    user.files.forEach((file) => byId.set(file.id, file));
  }
  const dataset = typeof getPaperHubDataset === "function" ? getPaperHubDataset() : {};
  (dataset.files || []).forEach((file) => {
    if (file.ownerId === user.id) byId.set(file.id, file);
  });
  return [...byId.values()];
}

function getCurrentUserPayment() {
  const user = getCurrentUserData();
  return user ? user.payment || null : null;
}

function getCurrentUserNotifications() {
  const user = getCurrentUserData();
  return user && Array.isArray(user.notifications) ? user.notifications : [];
}

function canAccessPathByRole(pathname, role) {
  const path = String(pathname || "").toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (path.includes("/pages/dashboard/admin.html")) {
    return normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/officer.html")) {
    return normalizedRole === "officer" || normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/user.html")) {
    return normalizedRole === "user" || normalizedRole === "admin";
  }

  if (path.includes("/pages/review/review-queue.html")) {
    return normalizedRole === "officer" || normalizedRole === "admin";
  }

  if (path.includes("/pages/review/review-details.html")) {
    return true;
  }

  if (path.includes("/pages/payment/")) {
    return normalizedRole === "user" || normalizedRole === "admin";
  }

  if (path.includes("/pages/file/upload.html")) {
    return normalizedRole === "user";
  }

  return true;
}

function enforcePageAccess() {
  const currentUser = getCurrentUserData();
  const hasAccess = canAccessPathByRole(window.location.pathname, currentUser.role);
  if (hasAccess) {
    return true;
  }

  const redirectPath = getDashboardRouteForUser(currentUser);
  window.location.replace(redirectPath);
  return false;
}
