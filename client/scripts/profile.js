(function () {
  "use strict";

  function updateProfileSnapshot() {
    var nameInput = document.getElementById("full-name");
    var emailInput = document.getElementById("email");
    var phoneInput = document.getElementById("phone");
    var locationInput = document.getElementById("location");
    var departmentInput = document.getElementById("department");

    var map = [
      [".profile-hero__name", nameInput && nameInput.value],
      [".profile-info-item:nth-child(1) .profile-info-item__value", nameInput && nameInput.value],
      [".profile-info-item:nth-child(2) .profile-info-item__value", emailInput && emailInput.value],
      [".profile-info-item:nth-child(3) .profile-info-item__value", phoneInput && phoneInput.value],
      [
        ".profile-info-item:nth-child(4) .profile-info-item__value",
        departmentInput && departmentInput.value,
      ],
      [
        ".profile-info-item:nth-child(5) .profile-info-item__value",
        locationInput && locationInput.value,
      ],
    ];

    map.forEach(function (entry) {
      var node = document.querySelector(entry[0]);
      if (node && entry[1]) {
        node.textContent = entry[1];
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var profileForm = document.querySelector('form[aria-label="Profile details form"]');
    if (profileForm) {
      profileForm.addEventListener("submit", function (event) {
        event.preventDefault();
        updateProfileSnapshot();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Profile updated successfully.");
        }
      });
    }

    var cancelBtn = Array.from(document.querySelectorAll(".profile-panel--wide .btn")).find(
      function (button) {
        return button.textContent.trim() === "Cancel";
      },
    );

    if (cancelBtn && profileForm) {
      cancelBtn.addEventListener("click", function () {
        profileForm.reset();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Changes discarded.");
        }
      });
    }

    var settingsForm = document.querySelector('form[aria-label="Account settings form"]');
    if (settingsForm) {
      settingsForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Account settings updated.");
        }
      });
    }

    var resetPasswordBtn = Array.from(document.querySelectorAll("button.btn")).find(
      function (button) {
        return button.textContent.trim() === "Reset Password";
      },
    );

    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener("click", function () {
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Password reset link sent to your work email.");
        }
      });
    }

    var signOutBtn = Array.from(document.querySelectorAll("button.btn")).find(function (button) {
      return button.textContent.trim() === "Sign Out From All Devices";
    });

    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("All sessions signed out except this device (demo).");
        }
      });
    }
  });
})();
