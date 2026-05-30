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
const ALLOWED_FILE_TYPES = new Set(Object.keys(FILE_ICON_MAP));
const ALLOWED_FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
]);
const uploadState = new Map();
let filePageItems = [];
let filePageFilteredItems = [];
let filePageSearch = "";
let filePageStatusFilter = "all";
let filePageSortBy = "recent";
let selectedFileId = null;

function initFileUploadPage() {
  const dropzone = getElement(".upload-dropzone");
  const fileInput = getElement("#fileInput");
  const uploadBtn = getElement("#uploadBtn");

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
      showError(`File ${file.name} is not allowed`);
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
    showError(`File ${file.name} exceeds 50MB limit`);
    return false;
  }

  const extension = getFileExtension(file.name);
  const hasAllowedMimeType = ALLOWED_FILE_TYPES.has(file.type);
  const hasAllowedExtension = ALLOWED_FILE_EXTENSIONS.has(extension);

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    showError(`File type ${file.type} not allowed`);
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
  });
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
        addClass(filePreview, "file-preview-success");
        uploadedCount++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        showError(`Failed to upload ${file.name}`);
      }
    }
  } finally {
    uploadBtn.disabled = false;
  }

  if (uploadedCount === fileEntries.length) {
    showSuccess("All files uploaded successfully!");
    setTimeout(() => {
      window.location.href = "/pages/file/files.html";
    }, 1000);
  }
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
  loadFileList();
}

function setupFileDetailsInteractions() {
  const searchInput = getElement("#fileSearchInput");
  const statusFilter = getElement("#fileStatusFilter");
  const sortSelect = getElement("#fileSortSelect");
  const importBtn = getElement("#importCsvBtn");

  addEvent(searchInput, "input", () => {
    filePageSearch = String(searchInput?.value || "").trim().toLowerCase();
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
    showInfo(`Previewing ${file.name}`);
  });

  addEvent(getElement("#metaDownloadBtn"), "click", () => {
    const file = getSelectedFile();
    if (!file) {
      showWarning("Select a file first");
      return;
    }
    showSuccess(`Downloading ${file.name}`);
  });
}

async function loadFileList() {
  const fileTableBody = getElement("#fileTableBody");
  if (!fileTableBody) return;

  try {
    const currentFiles = typeof getCurrentUserFiles === "function" ? getCurrentUserFiles() : null;
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
}

function getFilteredAndSortedFiles(files) {
  const filtered = files.filter((file) => {
    const normalizedStatus = String(file.status || "").toLowerCase();
    const matchesStatus = filePageStatusFilter === "all" || normalizedStatus === filePageStatusFilter;
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

  row.innerHTML = `
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
      showInfo(`Opening ${file.name}`);
      return;
    }

    if (action === "download") {
      showSuccess(`Downloading ${file.name}`);
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
  setText("#metaOwner", currentUser?.name || "PaperHub User");
  setText("#metaUpdated", file ? formatDate(file.uploadedAt) : "—");
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

function initVersionHistoryPage() {
  loadVersionHistory();
}

function loadVersionHistory() {
  const historyContainer = getElement("#versionHistoryContainer");
  if (!historyContainer) return;

  try {
    const versions = [
      {
        version: "v3.0",
        date: "2024-04-07",
        author: "John Doe",
        changes: "Final review and approval",
        size: "2.1 MB",
      },
      {
        version: "v2.5",
        date: "2024-04-05",
        author: "Jane Smith",
        changes: "Updated financial data",
        size: "2.0 MB",
      },
      {
        version: "v2.0",
        date: "2024-04-03",
        author: "John Doe",
        changes: "Initial submission",
        size: "1.9 MB",
      },
    ];

    const fragment = document.createDocumentFragment();

    versions.forEach((version, index) => {
      const versionItem = createElement("div", "version-item");
      versionItem.innerHTML = `
        <div class="version-header">
          <div class="version-info">
            <h4 class="version-title">${version.version}</h4>
            <p class="version-meta">
              <span class="version-date">${formatDate(version.date)}</span>
              <span class="version-author">by ${version.author}</span>
            </p>
          </div>
          <div class="version-actions">
            <button class="btn btn-sm btn-outline">View</button>
            <button class="btn btn-sm btn-outline">Download</button>
            ${index === 0 ? "" : '<button class="btn btn-sm btn-outline">Restore</button>'}
          </div>
        </div>
        <p class="version-changes">${version.changes}</p>
        <p class="version-size">File size: ${version.size}</p>
        ${index < versions.length - 1 ? '<div class="version-divider"></div>' : ""}
      `;
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
  }
});
