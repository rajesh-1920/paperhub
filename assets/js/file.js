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

  if (fileList.children.length > 0) {
    const uploadBtn = getElement("#uploadBtn");
    if (uploadBtn) showElement(uploadBtn);
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
  uploadState.set(fileKey, file);

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

  const files = fileList.querySelectorAll(".file-preview-item");
  if (files.length === 0) {
    showError("No files to upload");
    return;
  }

  const uploadBtn = getElement("#uploadBtn");
  uploadBtn.disabled = true;

  let uploadedCount = 0;

  for (const filePreview of files) {
    const file = uploadState.get(filePreview.getAttribute("data-file-key"));
    const fileId = filePreview.getAttribute("data-file-id");

    if (!file) {
      continue;
    }

    try {
      const statusEl = getElement(`#status-${fileId}`);
      const progressEl = getElement(`#progress-${fileId}`);

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

  uploadBtn.disabled = false;

  if (uploadedCount === files.length) {
    showSuccess("All files uploaded successfully!");
    setTimeout(() => {
      window.location.href = "/pages/file/file-details.html";
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
  loadFileList();
}

async function loadFileList() {
  const fileTableBody = getElement("#fileTableBody");
  if (!fileTableBody) return;

  try {
    fileTableBody.innerHTML = "";
    const response = await apiCall("/api/files");

    if (response.success && response.data) {
      response.data.forEach((file) => {
        const row = createElement("tr");
        row.innerHTML = `
          <td>
            <div class="file-cell">
              <span class="file-type-icon">${getFileIcon("application/pdf")}</span>
              <span class="file-name-cell">${file.name}</span>
            </div>
          </td>
          <td>${formatFileSize(file.size)}</td>
          <td><span class="badge badge-${file.status === "completed" ? "success" : file.status === "reviewing" ? "warning" : "primary"}">${file.status}</span></td>
          <td>${formatDate(file.uploadedAt)}</td>
          <td>
            <div class="file-actions">
              <button class="btn btn-sm btn-outline">View</button>
              <button class="btn btn-sm btn-outline">Download</button>
            </div>
          </td>
        `;
        fileTableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error loading files:", error);
    showError("Failed to load files");
  }
}

function initVersionHistoryPage() {
  loadVersionHistory();
}

async function loadVersionHistory() {
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
      historyContainer.appendChild(versionItem);
    });
  } catch (error) {
    console.error("Error loading version history:", error);
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
