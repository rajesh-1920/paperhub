const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const FILE_ICON_MAP = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
};
// Uploads are restricted to PDF files only.
const ALLOWED_FILE_TYPES = new Set(["application/pdf"]);
const ALLOWED_FILE_EXTENSIONS = new Set(["pdf"]);
const uploadState = new Map();
let filePageItems = [];
let filePageFilteredItems = [];
let filePageSearch = "";
let filePageStatusFilter = "all";
let filePageSortBy = "recent";
let selectedFileId = null;
const filePageSelected = new Set();

function initFileUploadPage() {
  const dropzone = getElement(".upload-dropzone");
  const fileInput = getElement("#fileInput");
  const uploadBtn = getElement("#uploadBtn");
  const clearBtn = getElement("#clearQueue");
  const startAllBtn = getElement("#metaStartAll");

  if (dropzone) {
    addEvent(dropzone, "dragover", handleDragOver);
    addEvent(dropzone, "dragleave", handleDragLeave);
    addEvent(dropzone, "drop", handleFileDrop);

    addEvent(dropzone, "click", () => fileInput?.click());
  }

  if (fileInput) {
    addEvent(fileInput, "change", handleFileSelect);
  }

  if (uploadBtn) {
    addEvent(uploadBtn, "click", handleUpload);
  }

  if (clearBtn) {
    addEvent(clearBtn, "click", handleClearQueue);
  }

  if (startAllBtn) {
    addEvent(startAllBtn, "click", handleUpload);
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  addClass(e.currentTarget, "upload-dropzone-active");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  removeClass(e.currentTarget, "upload-dropzone-active");
}

function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  removeClass(e.currentTarget, "upload-dropzone-active");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFiles(files);
  }
}

function handleFileSelect(e) {
  handleFiles(e.target.files);
}

function handleFiles(files) {
  const fileList = getElement(".file-preview-list");
  const uploadBtn = getElement("#uploadBtn");
  if (!fileList) return;

  Array.from(files).forEach((file) => {
    if (!validateFile(file)) {
      // validateFile already surfaced a specific reason.
      return;
    }

    if (isDuplicateFile(file)) {
      showWarning(`File ${file.name} is already selected`);
      return;
    }

    addFilePreview(fileList, file);
  });

  if (fileList.children.length > 0 && uploadBtn) {
    showElement(uploadBtn);
  }
}

function validateFile(file) {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    showError(`File ${file.name} exceeds the 50MB limit`);
    return false;
  }

  // PDF only: require a .pdf extension and a matching (or empty) MIME type, so a
  // renamed non-PDF (e.g. image saved as .pdf) is also rejected.
  const extension = getFileExtension(file.name);
  const isPdf =
    ALLOWED_FILE_EXTENSIONS.has(extension) && (!file.type || ALLOWED_FILE_TYPES.has(file.type));

  if (!isPdf) {
    showError(`Only PDF files can be uploaded — "${file.name}" was rejected`);
    return false;
  }

  return true;
}

function addFilePreview(container, file) {
  const fileId = createUploadId();
  const fileKey = getFileSignature(file);

  const filePreview = createElement("div", "file-preview-item");
  filePreview.setAttribute("data-file-id", fileId);
  filePreview.setAttribute("data-file-key", fileKey);

  filePreview.innerHTML = `
    <div class="file-icon">
      ${getFileIcon(file.type)}
    </div>
    <div class="file-info">
      <div class="file-name">${escapeHtml(file.name)}</div>
      <div class="file-size">${formatFileSize(file.size)}</div>
      <div class="file-progress">
        <div class="progress-bar" id="progress-${fileId}" style="width: 0%"></div>
      </div>
      <div class="file-status" id="status-${fileId}">Ready to upload</div>
    </div>
    <button class="file-remove" data-file-id="${fileId}" type="button">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
  `;

  container.appendChild(filePreview);

  const statusEl = filePreview.querySelector(".file-status");
  const progressEl = filePreview.querySelector(".progress-bar");
  uploadState.set(fileKey, { file, filePreview, statusEl, progressEl });

  const removeBtn = filePreview.querySelector(".file-remove");
  addEvent(removeBtn, "click", () => {
    uploadState.delete(fileKey);
    removeElement(filePreview);
    if (container.children.length === 0) {
      hideElement(getElement("#uploadBtn"));
    }
    updateUploadSummary();
  });
  updateUploadSummary();
}

function updateUploadSummary() {
  let count = 0;
  let total = 0;
  for (const entry of uploadState.values()) {
    count++;
    total += Number(entry.file.size || 0);
  }
  setText("#metaQueued", String(count));
  setText("#metaTotalSize", formatFileSize(total));
}

function handleClearQueue() {
  uploadState.clear();
  const list = getElement(".file-preview-list");
  if (list) {
    list.innerHTML = "";
  }
  hideElement(getElement("#uploadBtn"));
  updateUploadSummary();
}

function getFileIcon(fileType) {
  return FILE_ICON_MAP[fileType] || "📎";
}

async function handleUpload() {
  const fileList = getElement(".file-preview-list");
  if (!fileList) return;

  const fileEntries = Array.from(uploadState.values());
  if (fileEntries.length === 0) {
    showError("No files to upload");
    return;
  }

  const uploadBtn = getElement("#uploadBtn");
  if (!uploadBtn) {
    return;
  }

  uploadBtn.disabled = true;

  // Storage-quota pre-check (the server is the authoritative gate).
  const queuedBytes = fileEntries.reduce((sum, e) => sum + Number(e.file?.size || 0), 0);
  const quotaUser = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
  if (quotaUser && typeof phStorageUsage === "function") {
    const usage = phStorageUsage(quotaUser.id);
    if (usage.usedBytes + queuedBytes > usage.limitBytes) {
      showError("Not enough storage to upload these files. Free up space first.");
      uploadBtn.disabled = false;
      return;
    }
  }

  let uploadedCount = 0;

  try {
    for (const entry of fileEntries) {
      const { file, filePreview, statusEl, progressEl } = entry;

      if (!file || !filePreview) {
        continue;
      }

      try {
        if (statusEl) {
          statusEl.textContent = "Uploading...";
        }

        await simulateUpload(progressEl);

        if (statusEl) {
          statusEl.textContent = "Uploaded successfully";
          statusEl.style.color = "var(--success)";
        }
        const pageCount = await countPdfPagesFromFile(file);
        const record = persistUploadedFile(file, pageCount);
        const result = record ? await uploadFileBinary(record.id, file) : null;
        const stored = Boolean(result);
        // The server re-parses the bytes (handles compressed PDFs the client
        // heuristic can't) — trust its page count when it returns one.
        if (record && result && result.pages && typeof phSetFilePageCount === "function") {
          phSetFilePageCount(record.id, result.pages);
        }
        if (!record || !stored) {
          // Roll back the metadata record so there is no entry pointing at
          // missing bytes (which would 404 on view/download).
          if (record && typeof phDeleteFile === "function") {
            phDeleteFile(record.id);
          }
          if (statusEl) {
            statusEl.textContent = "Upload failed";
            statusEl.style.color = "var(--danger)";
          }
          showError(`Could not store ${file.name} — please try again`);
          continue;
        }

        addClass(filePreview, "file-preview-success");
        uploadedCount++;
        if (typeof logActivityViaApi === "function") {
          logActivityViaApi("file.upload", { resourceId: record.id, resourceName: file.name });
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        showError(`Failed to upload ${file.name}`);
      }
    }
  } finally {
    uploadBtn.disabled = false;
  }

  if (uploadedCount === fileEntries.length) {
    showSuccess(
      `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded and sent for review`,
    );
    setTimeout(() => {
      window.location.href =
        typeof resolveAppPath === "function"
          ? resolveAppPath("pages/file/files.html")
          : "/pages/file/files.html";
    }, 1000);
  }
}

// Best-effort PDF page count from the raw bytes. Uses the page-tree /Count and
// the number of /Type /Page objects (latin1 so byte values survive), taking the
// larger; falls back to 1 if the file can't be read or parsed.
async function countPdfPagesFromFile(file) {
  try {
    if (!file || typeof file.arrayBuffer !== "function") return 1;
    const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
    const pageObjects = (text.match(/\/Type\s*\/Page(?![sA-Za-z])/g) || []).length;
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
    const maxCount = counts.length ? Math.max(...counts) : 0;
    return Math.max(pageObjects, maxCount, 1);
  } catch (error) {
    return 1;
  }
}

function persistUploadedFile(file, pageCount = 1) {
  if (typeof phAddFile !== "function") {
    return;
  }

  const user = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
  if (!user) {
    return;
  }

  const dataset = typeof getPaperHubDataset === "function" ? getPaperHubDataset() : {};
  const officer = (dataset.users || []).find((entry) => entry.role === "officer");
  const reviewerName = officer ? officer.name : "Review Officer";
  const extension = getFileExtension(file.name);
  const nowIso = new Date().toISOString();
  const id = typeof generateId === "function" ? generateId("file") : `file-${Date.now()}`;

  const safeName = typeof phSanitizeName === "function" ? phSanitizeName(file.name) : file.name;
  const newFile = {
    id,
    name: safeName,
    size: Number(file.size || 0),
    sizeLabel: formatFileSize(Number(file.size || 0)),
    uploadedAt: nowIso,
    updatedAt: nowIso,
    status: "pending",
    ownerId: user.id,
    ownerName: user.name,
    ownerRole: user.role,
    category: user.role,
    department: user.department || "General",
    reviewer: reviewerName,
    fileType: getFileTypeLabel(extension),
    extension,
    mimeType: "application/pdf",
    pageCount: Number(pageCount) || 1,
    version: "v1.0",
    tags: ["Upload", "Bangladesh"],
    description: `Uploaded by ${user.name} via PaperHub.`,
    summary: "Newly uploaded document awaiting review.",
    // The real PDF bytes are stored server-side and served from
    // /api/files/<id>/content; hasContent tells the UI to embed the PDF.
    hasContent: true,
  };

  const reviewItem = {
    id: `${id}-review`,
    fileId: id,
    documentName: newFile.name,
    submittedBy: user.name,
    submittedDate: nowIso.slice(0, 10),
    priority: "medium",
    status: "pending",
    department: newFile.department,
    reviewer: reviewerName,
    dueDate: "Today",
    pageCount: Number(pageCount) || 1,
    tags: newFile.tags,
    summary: newFile.summary,
    reviewReason: newFile.summary,
    fileType: newFile.fileType,
    ownerName: user.name,
    hasContent: true,
    checklist: [
      { label: "Core details verified", done: false },
      { label: "Supporting evidence attached", done: false },
      { label: "Approval chain confirmed", done: false },
    ],
    comments: [],
    highlights: [
      `${newFile.fileType} • 1 page`,
      newFile.description,
      "Tracked in the PaperHub review queue",
    ],
  };

  phAddFile(newFile, reviewItem);
  return newFile;
}

// URL that serves a file's stored PDF bytes (same origin as the app).
function fileContentUrl(file) {
  return new URL(`/api/files/${encodeURIComponent(file.id)}/content`, window.location.origin).href;
}

// Query the server-side search endpoint (owner-scoped). Returns
// { items, total, page, pageSize, pages }; an empty result on failure.
async function searchFilesViaApi(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, value);
  });
  const url = new URL(`/api/files/search?${qs.toString()}`, window.location.origin).href;
  const headers = {};
  const token = typeof getAuthToken === "function" ? getAuthToken() : "";
  if (token) headers.Authorization = "Bearer " + token;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { items: [], total: 0, page: 1, pageSize: 20, pages: 1 };
    }
    return await response.json();
  } catch (error) {
    return { items: [], total: 0, page: 1, pageSize: 20, pages: 1 };
  }
}

// Authorization header for the (protected) content routes, when signed in.
function fileAuthHeaders(extra) {
  const headers = Object.assign({}, extra);
  const token = typeof getAuthToken === "function" ? getAuthToken() : "";
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  return headers;
}

// Upload the real PDF bytes to the backend for a just-created file record.
async function uploadFileBinary(id, file) {
  const url = new URL(`/api/files/${encodeURIComponent(id)}/content`, window.location.origin).href;
  const doPut = () =>
    fetch(url, {
      method: "PUT",
      headers: fileAuthHeaders({ "Content-Type": "application/pdf" }),
      body: file,
    });
  try {
    let response = await doPut();
    if (
      response.status === 401 &&
      typeof refreshAccessTokenSync === "function" &&
      refreshAccessTokenSync()
    ) {
      response = await doPut();
    }
    if (!response.ok) return null;
    // Body carries the server-parsed page count: { ok, size, pages }.
    return await response.json().catch(() => ({ ok: true }));
  } catch (error) {
    return null;
  }
}

// Upload a new version's bytes; returns { versionId, contentRef, size } or null.
async function uploadFileVersionViaApi(fileId, file) {
  const url = new URL(`/api/files/${encodeURIComponent(fileId)}/versions`, window.location.origin)
    .href;
  const doPost = () =>
    fetch(url, {
      method: "POST",
      headers: fileAuthHeaders({ "Content-Type": "application/pdf" }),
      body: file,
    });
  try {
    let response = await doPost();
    if (
      response.status === 401 &&
      typeof refreshAccessTokenSync === "function" &&
      refreshAccessTokenSync()
    ) {
      response = await doPost();
    }
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

function deleteFileBinary(id) {
  try {
    fetch(new URL(`/api/files/${encodeURIComponent(id)}/content`, window.location.origin).href, {
      method: "DELETE",
      headers: fileAuthHeaders(),
    });
  } catch (error) {
    /* best effort */
  }
}

function getFileTypeLabel(extension) {
  const map = {
    pdf: "PDF Document",
    doc: "Word Document",
    docx: "Word Document",
    xls: "Excel Spreadsheet",
    xlsx: "Excel Spreadsheet",
    png: "Image File",
    jpg: "Image File",
    jpeg: "Image File",
  };
  return map[String(extension || "").toLowerCase()] || "Document";
}

function createUploadId() {
  if (window.crypto?.randomUUID) {
    return `file-${window.crypto.randomUUID()}`;
  }

  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFileExtension(fileName) {
  return String(fileName || "")
    .split(".")
    .pop()
    .toLowerCase();
}

function getFileSignature(file) {
  return [file.name, file.size, file.lastModified].join("::");
}

function isDuplicateFile(file) {
  return uploadState.has(getFileSignature(file));
}

async function simulateUpload(progressElement) {
  for (let i = 0; i <= 100; i += 10) {
    if (progressElement) {
      progressElement.style.width = i + "%";
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function initFileDetailsPage() {
  setupFileDetailsInteractions();
  setupBulkActions();
  loadFileList();
}

// Multi-select toolbar: move / tag / delete the checked files in one action.
function setupBulkActions() {
  const body = getElement("#fileTableBody");
  addEvent(body, "change", (event) => {
    const box = event.target.closest(".file-row-select");
    if (!box) return;
    const id = box.getAttribute("data-file-select");
    if (box.checked) filePageSelected.add(id);
    else filePageSelected.delete(id);
    refreshBulkUI();
  });

  addEvent(getElement("#fileSelectAll"), "change", (event) => {
    const checked = Boolean(event.target.checked);
    document.querySelectorAll(".file-row-select").forEach((box) => {
      box.checked = checked;
      const id = box.getAttribute("data-file-select");
      if (checked) filePageSelected.add(id);
      else filePageSelected.delete(id);
    });
    refreshBulkUI();
  });

  addEvent(getElement("#fileBulkMove"), "click", () => {
    if (!filePageSelected.size) return;
    const folderId = getElement("#fileBulkFolder")?.value || null;
    phMoveFiles([...filePageSelected], folderId || null);
    clearBulkSelection();
    showSuccess("Moved selected files");
    loadFileList();
  });

  addEvent(getElement("#fileBulkTagBtn"), "click", () => {
    if (!filePageSelected.size) return;
    const label = String(getElement("#fileBulkTag")?.value || "").trim();
    if (!label) {
      showWarning("Enter a tag name");
      return;
    }
    const tag = typeof phCreateTag === "function" ? phCreateTag({ label }) : null;
    if (tag) phTagFiles([...filePageSelected], tag.id);
    const input = getElement("#fileBulkTag");
    if (input) input.value = "";
    clearBulkSelection();
    showSuccess(`Tagged with "${label}"`);
    loadFileList();
  });

  addEvent(getElement("#fileBulkDelete"), "click", () => {
    if (!filePageSelected.size) return;
    if (!window.confirm(`Move ${filePageSelected.size} selected file(s) to Trash?`)) return;
    phTrashFiles([...filePageSelected]);
    clearBulkSelection();
    showSuccess("Moved selected files to Trash");
    loadFileList();
  });

  populateBulkFolders();
}

function populateBulkFolders() {
  const select = getElement("#fileBulkFolder");
  if (!select || typeof phListFolders !== "function") return;
  const user = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
  const folders = phListFolders(user?.id);
  select.innerHTML =
    '<option value="">Root</option>' +
    folders
      .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.path || f.name)}</option>`)
      .join("");
}

function refreshBulkUI() {
  const bar = getElement("#fileBulkBar");
  const count = getElement("#fileBulkCount");
  if (count) count.textContent = `${filePageSelected.size} selected`;
  if (bar) bar.hidden = filePageSelected.size === 0;
}

function clearBulkSelection() {
  filePageSelected.clear();
  const selectAll = getElement("#fileSelectAll");
  if (selectAll) selectAll.checked = false;
  refreshBulkUI();
}

function setupFileDetailsInteractions() {
  const searchInput = getElement("#fileSearchInput");
  const statusFilter = getElement("#fileStatusFilter");
  const sortSelect = getElement("#fileSortSelect");
  const importBtn = getElement("#importCsvBtn");

  addEvent(searchInput, "input", () => {
    filePageSearch = String(searchInput?.value || "")
      .trim()
      .toLowerCase();
    renderFileTable();
  });

  addEvent(statusFilter, "change", () => {
    filePageStatusFilter = String(statusFilter?.value || "all").toLowerCase();
    syncStatusChip(filePageStatusFilter);
    renderFileTable();
  });

  addEvent(sortSelect, "change", () => {
    filePageSortBy = String(sortSelect?.value || "recent").toLowerCase();
    renderFileTable();
  });

  getElements("[data-status-chip]").forEach((chip) => {
    addEvent(chip, "click", () => {
      const nextFilter = String(chip.getAttribute("data-status-chip") || "all").toLowerCase();
      filePageStatusFilter = nextFilter;
      if (statusFilter) {
        statusFilter.value = nextFilter;
      }
      syncStatusChip(nextFilter);
      renderFileTable();
    });
  });

  addEvent(importBtn, "click", () => {
    showInfo("CSV import is coming soon.");
  });

  addEvent(getElement("#metaPreviewBtn"), "click", () => {
    const file = getSelectedFile();
    if (!file) {
      showWarning("Select a file first");
      return;
    }
    renderFileContent(file);
    const card = getElement(".file-content-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  addEvent(getElement("#metaDownloadBtn"), "click", () => downloadFile(getSelectedFile()));
  addEvent(getElement("#metaShareBtn"), "click", shareSelectedFile);
  addEvent(getElement("#metaDeleteBtn"), "click", deleteSelectedFile);
}

// Create a view-only share link for the selected file and copy it to clipboard.
async function shareSelectedFile() {
  const file = getSelectedFile();
  if (!file || !file.id) {
    showWarning("Select a file first");
    return;
  }
  if (typeof createShareLinkViaApi !== "function") return;
  try {
    const { token } = await createShareLinkViaApi("file", file.id, { permission: "view" });
    if (typeof logActivityViaApi === "function") {
      logActivityViaApi("share.create", { resourceId: file.id, resourceName: file.name });
    }
    const url = typeof shareLinkUrl === "function" ? shareLinkUrl(token) : token;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        showSuccess("Share link copied to clipboard");
      } else {
        showSuccess(`Share link: ${url}`);
      }
    } catch (clipErr) {
      showSuccess(`Share link: ${url}`);
    }
  } catch (error) {
    showError(error.message || "Could not create a share link");
  }
}

function viewFileContent(file) {
  if (!file) {
    showWarning("No file to view");
    return;
  }

  // Real uploaded PDF — open it so the browser renders the full document.
  if (file.hasContent) {
    const opened = window.open(fileContentUrl(file), "_blank");
    if (!opened) {
      showInfo(`Pop-up blocked — downloading ${file.name} instead`);
      downloadFile(file);
    }
    return;
  }

  // Legacy/demo record with text content only.
  const text = file.content || `${file.name}\n\nNo stored content for this document.`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    showInfo(`Pop-up blocked — downloading ${file.name} instead`);
    downloadFile(file);
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function downloadFile(file) {
  if (!file) {
    showWarning("Select a file first");
    return;
  }

  const link = document.createElement("a");

  // Real uploaded PDF — download the actual bytes with the original name.
  if (file.hasContent) {
    link.href = fileContentUrl(file);
    link.download = ensureExtension(file.name, "pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Downloaded ${link.download}`);
    return;
  }

  // Legacy/demo record — export its text content.
  const text = file.content || `${file.name}\n\nNo stored content for this document.`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${String(file.name || "document").replace(/\.[^.]+$/, "")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showSuccess(`Downloaded ${link.download}`);
}

function ensureExtension(name, ext) {
  const base = String(name || "document");
  return new RegExp(`\\.${ext}$`, "i").test(base) ? base : `${base.replace(/\.[^.]+$/, "")}.${ext}`;
}

function deleteSelectedFile() {
  const file = getSelectedFile();
  if (!file) {
    showWarning("Select a file first");
    return;
  }

  if (!confirm(`Move "${file.name}" to Trash?`)) {
    return;
  }

  if (typeof phTrashFile === "function") {
    phTrashFile(file.id);
  }
  if (typeof logActivityViaApi === "function") {
    logActivityViaApi("file.trash", { resourceId: file.id, resourceName: file.name });
  }

  selectedFileId = null;
  loadFileList();
  showSuccess(`Moved ${file.name} to Trash`);
}

async function loadFileList() {
  const fileTableBody = getElement("#fileTableBody");
  if (!fileTableBody) return;

  try {
    const ownedFiles = typeof getCurrentUserFiles === "function" ? getCurrentUserFiles() : null;
    // The active list hides trashed (soft-deleted) files — they live in Trash.
    const currentFiles = Array.isArray(ownedFiles)
      ? ownedFiles.filter((f) => !f.deletedAt)
      : ownedFiles;
    const response =
      currentFiles && currentFiles.length > 0
        ? { success: true, data: currentFiles }
        : await apiCall("/api/files");

    if (response.success && response.data) {
      filePageItems = response.data.map((file, index) => ({
        ...file,
        _id: `${file.name || "file"}-${index}`,
      }));

      if (!selectedFileId && filePageItems.length) {
        selectedFileId = filePageItems[0]._id;
      }

      syncStatusChip(filePageStatusFilter);
      renderFileTable();
      updateFileStats(filePageItems);
      updateStorageHealth(filePageItems);
      updateMetaPanel(getSelectedFile());
    }
  } catch (error) {
    showError("Failed to load files");
  }
}

function renderFileTable() {
  const fileTableBody = getElement("#fileTableBody");
  const emptyState = getElement("#filesEmptyState");
  if (!fileTableBody) {
    return;
  }

  filePageFilteredItems = getFilteredAndSortedFiles(filePageItems);
  fileTableBody.innerHTML = "";

  if (!filePageFilteredItems.length) {
    if (emptyState) {
      emptyState.style.display = "block";
    }
    updateVisibleFilesCount(0);
    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  const fragment = document.createDocumentFragment();
  filePageFilteredItems.forEach((file) => {
    fragment.appendChild(createFileRow(file));
  });

  fileTableBody.appendChild(fragment);
  updateVisibleFilesCount(filePageFilteredItems.length);

  if (!filePageFilteredItems.some((file) => file._id === selectedFileId)) {
    selectedFileId = filePageFilteredItems[0]?._id || null;
  }

  updateMetaPanel(getSelectedFile());
  syncSelectedRowState();
  if (typeof refreshBulkUI === "function") refreshBulkUI();
}

function getFilteredAndSortedFiles(files) {
  const filtered = files.filter((file) => {
    const normalizedStatus = String(file.status || "").toLowerCase();
    const matchesStatus =
      filePageStatusFilter === "all" || normalizedStatus === filePageStatusFilter;
    const searchIndex = `${file.name || ""} ${normalizedStatus}`.toLowerCase();
    const matchesSearch = !filePageSearch || searchIndex.includes(filePageSearch);
    return matchesStatus && matchesSearch;
  });

  return filtered.sort((left, right) => {
    if (filePageSortBy === "oldest") {
      return new Date(left.uploadedAt).getTime() - new Date(right.uploadedAt).getTime();
    }

    if (filePageSortBy === "name-asc") {
      return String(left.name || "").localeCompare(String(right.name || ""));
    }

    if (filePageSortBy === "name-desc") {
      return String(right.name || "").localeCompare(String(left.name || ""));
    }

    if (filePageSortBy === "size-desc") {
      return Number(right.size || 0) - Number(left.size || 0);
    }

    return new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime();
  });
}

function createFileRow(file) {
  const row = createElement("tr", "file-row");
  row.setAttribute("data-file-id", file._id);

  const selectId = file.id || file._id;
  row.innerHTML = `
    <td class="file-select-col">
      <input type="checkbox" class="file-row-select" data-file-select="${escapeHtml(selectId)}" ${
        filePageSelected.has(selectId) ? "checked" : ""
      } aria-label="Select file" />
    </td>
    <td>
      <div class="file-cell">
        <span class="file-type-icon">${escapeHtml(getFileIconByName(file.name))}</span>
        <div>
          <span class="file-name-cell">${escapeHtml(file.name || "Untitled")}</span>
          <span class="file-name-meta">${escapeHtml(getFileExtension(file.name || "file").toUpperCase())} document</span>
        </div>
      </div>
    </td>
    <td>${formatFileSize(Number(file.size || 0))}</td>
    <td><span class="file-status-pill status-${escapeHtml(normalizeFileStatus(file.status))}">${escapeHtml(formatFileStatusLabel(file.status))}</span></td>
    <td>${formatDate(file.uploadedAt)}</td>
    <td>
      <div class="file-actions">
        <button class="btn btn-sm btn-outline" type="button" data-action="view">View</button>
        <button class="btn btn-sm btn-outline" type="button" data-action="download">Download</button>
      </div>
    </td>
  `;

  addEvent(row, "click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    selectedFileId = file._id;
    updateMetaPanel(file);
    syncSelectedRowState();

    if (!actionButton) {
      return;
    }

    const action = actionButton.getAttribute("data-action");
    if (action === "view") {
      renderFileContent(file);
      const card = getElement(".file-content-card");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    if (action === "download") {
      downloadFile(file);
    }
  });

  return row;
}

function syncSelectedRowState() {
  getElements(".file-row").forEach((row) => {
    const rowId = row.getAttribute("data-file-id");
    row.classList.toggle("is-selected", rowId === selectedFileId);
  });
}

function updateVisibleFilesCount(count) {
  const visibleCount = getElement("#filesVisibleCount");
  if (visibleCount) {
    visibleCount.textContent = `${count} file${count === 1 ? "" : "s"} visible`;
  }
}

function updateFileStats(files) {
  const total = files.length;
  const reviewing = files.filter((file) => normalizeFileStatus(file.status) === "reviewing").length;
  const pending = files.filter((file) => normalizeFileStatus(file.status) === "pending").length;
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);

  setText("#filesStatTotal", String(total));
  setText("#filesStatReviewing", String(reviewing));
  setText("#filesStatPending", String(pending));
  setText("#filesStatTotalSize", formatFileSize(totalSize));
}

function updateStorageHealth(files) {
  const capacityBytes = 1024 * 1024 * 1024;
  const usedBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const usagePercentage = Math.min(100, Math.round((usedBytes / capacityBytes) * 100));

  const fill = getElement("#storageFill");
  if (fill) {
    fill.style.width = `${usagePercentage}%`;
  }

  setText("#storageLabel", `${usagePercentage}% used`);
}

function updateMetaPanel(file) {
  const currentUser = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
  setText("#metaSelected", file ? file.name : "—");
  setText("#metaOwner", file?.ownerName || currentUser?.name || "PaperHub User");
  setText(
    "#metaType",
    file?.fileType || (file ? getFileExtension(file.name).toUpperCase() + " Document" : "—"),
  );
  setText("#metaPages", file?.pageCount ? String(file.pageCount) : "—");
  setText("#metaStatus", file ? formatFileStatusLabel(file.status) : "—");
  setText("#metaUpdated", file ? formatDate(file.updatedAt || file.uploadedAt) : "—");
  setText("#metaDescription", file?.description || "");

  const tagsEl = getElement("#metaTags");
  if (tagsEl) {
    const tags = Array.isArray(file?.tags) ? file.tags : [];
    tagsEl.innerHTML = tags
      .map((tag) => `<span class="file-meta-tag">${escapeHtml(tag)}</span>`)
      .join("");
  }

  renderFileContent(file);
}

function renderFileContent(file) {
  const meta = getElement("#fileContentMeta");
  const body = getElement("#fileContentBody");
  if (!body) {
    return;
  }

  if (!file) {
    if (meta) meta.textContent = "Select a file to read its contents.";
    body.innerHTML = "";
    return;
  }

  if (meta) {
    const sizeLabel = file.sizeLabel || formatFileSize(Number(file.size || 0));
    meta.textContent = `${file.fileType || "Document"} • ${file.pageCount || 1} page${file.pageCount === 1 ? "" : "s"} • ${sizeLabel}`;
  }

  // Real uploaded PDF — embed the actual document so the full PDF is visible.
  if (file.hasContent) {
    body.innerHTML = `<iframe class="file-pdf-frame" src="${escapeHtml(fileContentUrl(file))}" title="${escapeHtml(file.name)}"></iframe>`;
    return;
  }

  // Legacy/demo record — show the stored text.
  const pre = createElement("pre", "file-content-text");
  pre.textContent = file.content ? String(file.content) : "No stored content for this document.";
  body.innerHTML = "";
  body.appendChild(pre);
}

function syncStatusChip(status) {
  getElements("[data-status-chip]").forEach((chip) => {
    const chipStatus = String(chip.getAttribute("data-status-chip") || "all").toLowerCase();
    chip.classList.toggle("active", chipStatus === status);
  });
}

function normalizeFileStatus(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "in-review") {
    return "reviewing";
  }
  return normalized;
}

function formatFileStatusLabel(status) {
  const normalized = normalizeFileStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getFileIconByName(fileName) {
  const extension = getFileExtension(fileName);

  if (extension === "pdf") {
    return "📄";
  }

  if (extension === "doc" || extension === "docx") {
    return "📝";
  }

  if (extension === "xls" || extension === "xlsx") {
    return "📊";
  }

  if (extension === "jpg" || extension === "jpeg" || extension === "png") {
    return "🖼️";
  }

  return "📎";
}

function getSelectedFile() {
  return filePageItems.find((file) => file._id === selectedFileId) || null;
}

function setText(selector, value) {
  const element = getElement(selector);
  if (element) {
    element.textContent = value;
  }
}

function initTrashPage() {
  loadTrash();
}

function loadTrash() {
  const container = getElement("#trashTableBody");
  if (!container) return;
  const user = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
  const trashed = typeof phListTrash === "function" ? phListTrash(user?.id) : [];
  const emptyState = getElement("#trashEmptyState");

  container.innerHTML = "";
  if (!trashed.length) {
    if (emptyState) emptyState.style.display = "block";
    const count = getElement("#trashCount");
    if (count) count.textContent = "Trash is empty";
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  const count = getElement("#trashCount");
  if (count)
    count.textContent = `${trashed.length} item${trashed.length === 1 ? "" : "s"} in Trash`;

  const fragment = document.createDocumentFragment();
  trashed.forEach((file) => {
    const row = createElement("tr", "file-row");
    row.innerHTML = `
      <td>
        <div class="file-cell">
          <span class="file-type-icon">${escapeHtml(getFileIconByName(file.name))}</span>
          <span class="file-name-cell">${escapeHtml(file.name || "Untitled")}</span>
        </div>
      </td>
      <td>${formatFileSize(Number(file.size || 0))}</td>
      <td>${formatDate(file.deletedAt)}</td>
      <td>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline" data-trash-act="restore">Restore</button>
          <button class="btn btn-sm btn-danger" data-trash-act="purge">Delete forever</button>
        </div>
      </td>`;
    addEvent(row.querySelector('[data-trash-act="restore"]'), "click", () => {
      if (typeof phRestoreFile === "function") phRestoreFile(file.id);
      showSuccess(`Restored ${file.name}`);
      loadTrash();
    });
    addEvent(row.querySelector('[data-trash-act="purge"]'), "click", () => {
      if (!window.confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;
      if (typeof phPurgeFile === "function") phPurgeFile(file.id);
      showSuccess(`Permanently deleted ${file.name}`);
      loadTrash();
    });
    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

function initVersionHistoryPage() {
  loadVersionHistory();
}

function loadVersionHistory() {
  const historyContainer = getElement("#versionHistoryContainer");
  if (!historyContainer) return;

  historyContainer.innerHTML = "";

  try {
    const currentUser = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
    const files = Array.isArray(currentUser?.files) ? currentUser.files : [];
    const wantedId = new URLSearchParams(window.location.search).get("id");
    const file = (wantedId && files.find((f) => f.id === wantedId)) || files[0] || null;

    const setEmpty = () => {
      historyContainer.innerHTML = `
        <div class="empty-state">
          <h3>No version history yet</h3>
          <p>Upload a document (and new versions of it) to build up its history.</p>
        </div>`;
      document.querySelectorAll("[data-version-file-name]").forEach((el) => (el.textContent = ""));
      document.querySelectorAll("[data-version-current]").forEach((el) => (el.textContent = ""));
    };

    if (!file) return setEmpty();

    // Newest first.
    const versions = (typeof phListVersions === "function" ? phListVersions(file.id) : [])
      .slice()
      .reverse();
    if (!versions.length) return setEmpty();

    const currentId =
      file.currentVersion || versions[0].versionId || versions[0].contentRef || null;
    const labelOf = (v) => v.versionLabel || `v${v.number}`;

    document.querySelectorAll("[data-version-file-name]").forEach((el) => {
      el.textContent = file.name || "";
    });
    document.querySelectorAll("[data-version-current]").forEach((el) => {
      const cur = versions.find((v) => v.versionId === currentId) || versions[0];
      el.textContent = cur ? labelOf(cur) : "";
    });

    const fragment = document.createDocumentFragment();
    versions.forEach((version) => {
      const isCurrent = version.versionId === currentId;
      const versionItem = createElement("div", "version-item");
      versionItem.innerHTML = `
        <div class="version-header">
          <div class="version-info">
            <h4 class="version-title">${escapeHtml(labelOf(version))}${isCurrent ? " (current)" : ""}</h4>
            <p class="version-meta">
              <span class="version-date">${formatDate(version.uploadedAt)}</span>
              <span class="version-author">by ${escapeHtml(version.uploadedByName || currentUser.name || "")}</span>
            </p>
          </div>
          <div class="version-actions">
            <button class="btn btn-sm btn-outline" data-version-act="view">View</button>
            <button class="btn btn-sm btn-outline" data-version-act="download">Download</button>
            ${isCurrent ? "" : '<button class="btn btn-sm btn-outline" data-version-act="restore">Restore</button>'}
          </div>
        </div>
        <p class="version-changes">${escapeHtml(version.changeNote || "Updated document")}</p>
        <p class="version-size">File size: ${escapeHtml(version.sizeLabel || formatFileSize(version.size || 0))}</p>
      `;

      const versionRef = { id: version.contentRef || file.id, name: file.name, hasContent: true };
      addEvent(versionItem.querySelector('[data-version-act="view"]'), "click", () =>
        viewFileContent(versionRef),
      );
      addEvent(versionItem.querySelector('[data-version-act="download"]'), "click", () =>
        downloadFile(versionRef),
      );
      addEvent(versionItem.querySelector('[data-version-act="restore"]'), "click", () => {
        if (typeof phRestoreVersion === "function") phRestoreVersion(file.id, version.versionId);
        showSuccess(`Restored ${labelOf(version)} of ${file.name}`);
        loadVersionHistory();
      });

      fragment.appendChild(versionItem);
    });
    historyContainer.appendChild(fragment);
  } catch (error) {
    showError("Failed to load version history");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("file-upload-page")) {
    initFileUploadPage();
  } else if (document.body.classList.contains("file-details-page")) {
    initFileDetailsPage();
  } else if (document.body.classList.contains("version-history-page")) {
    initVersionHistoryPage();
  } else if (document.body.classList.contains("trash-page")) {
    initTrashPage();
  }
});
