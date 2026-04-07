(function () {
  "use strict";

  function createFileItem(file) {
    var item = document.createElement("div");
    item.className = "upload-file-item";

    var meta = document.createElement("div");
    meta.className = "upload-file-item__meta";

    var name = document.createElement("span");
    name.className = "upload-file-item__name";
    name.textContent = file.name;

    var size = document.createElement("span");
    size.className = "upload-file-item__size";
    var formatter = window.PaperHubUI
      ? window.PaperHubUI.formatFileSize
      : function () {
          return "0 KB";
        };
    size.textContent = formatter(file.size) + " - " + (file.type || "Unknown format");

    var badge = document.createElement("span");
    badge.className = "badge badge--active";
    badge.textContent = "Ready";

    meta.appendChild(name);
    meta.appendChild(size);
    item.appendChild(meta);
    item.appendChild(badge);

    return item;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var dropzone = document.querySelector(".upload-dropzone");
    var input = document.getElementById("upload-file-input");
    var fileList = document.querySelector(".upload-file-list");
    var tagInput = document.getElementById("file-tags");

    if (!dropzone || !input || !fileList) {
      return;
    }

    function renderFiles(files) {
      if (!files.length) {
        return;
      }
      fileList.innerHTML = "";
      Array.from(files).forEach(function (file) {
        fileList.appendChild(createFileItem(file));
      });
      if (window.PaperHubUI) {
        window.PaperHubUI.showToast(files.length + " file(s) selected.");
      }
    }

    input.addEventListener("change", function () {
      renderFiles(input.files);
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", function (event) {
      if (!event.dataTransfer || !event.dataTransfer.files.length) {
        return;
      }
      renderFiles(event.dataTransfer.files);
    });

    document.querySelectorAll(".upload-tag").forEach(function (tag) {
      tag.addEventListener("click", function () {
        if (!tagInput) {
          return;
        }
        var token = tag.textContent.trim();
        var current = tagInput.value
          .split(",")
          .map(function (part) {
            return part.trim();
          })
          .filter(Boolean);

        if (current.indexOf(token) === -1) {
          current.push(token);
          tagInput.value = current.join(", ");
        }
      });
    });

    var clearBtn = Array.from(document.querySelectorAll(".upload-actions .btn")).find(
      function (button) {
        return button.textContent.trim() === "Clear";
      },
    );

    var draftBtn = Array.from(document.querySelectorAll(".upload-actions .btn")).find(
      function (button) {
        return button.textContent.trim() === "Save Draft";
      },
    );

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        var form = clearBtn.closest("form");
        if (form) {
          form.reset();
        }
        input.value = "";
        fileList.innerHTML = "";
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Upload form cleared.");
        }
      });
    }

    if (draftBtn) {
      draftBtn.addEventListener("click", function () {
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Draft saved locally for this session.");
        }
      });
    }

    var detailsForm = document.querySelector('form[aria-label="File details form"]');
    if (detailsForm) {
      detailsForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Files uploaded successfully (demo mode).");
        }
      });
    }
  });
})();
