(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var uploadButton = Array.from(document.querySelectorAll("button.btn")).find(function (button) {
      return button.textContent.trim() === "Upload File";
    });

    if (uploadButton) {
      uploadButton.addEventListener("click", function () {
        window.location.href = "upload.html";
      });
    }

    document.querySelectorAll(".table tbody a.btn").forEach(function (action) {
      action.addEventListener("click", function (event) {
        event.preventDefault();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Action queued: " + action.textContent.trim());
        }
      });
    });
  });
})();
