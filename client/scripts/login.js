(function () {
  "use strict";

  function addPasswordToggle() {
    var passwordInput = document.getElementById("password");
    if (!passwordInput || passwordInput.dataset.toggleReady === "true") {
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "form__row";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn--soft btn--sm";
    toggle.textContent = "Show Password";

    toggle.addEventListener("click", function () {
      var show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide Password" : "Show Password";
    });

    passwordInput.insertAdjacentElement("afterend", wrap);
    wrap.appendChild(toggle);
    passwordInput.dataset.toggleReady = "true";
  }

  document.addEventListener("DOMContentLoaded", function () {
    addPasswordToggle();

    var form = document.querySelector('form[aria-label="Login form"]');
    if (!form) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = document.getElementById("email");
      var password = document.getElementById("password");

      if (!email || !password || !email.value.trim() || !password.value.trim()) {
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Please enter both email and password.");
        }
        return;
      }

      if (window.PaperHubUI) {
        window.PaperHubUI.showToast("Welcome back. Redirecting to dashboard...");
      }

      window.setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 700);
    });
  });
})();
