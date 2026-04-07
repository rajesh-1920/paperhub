(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var hints = [
      "Press H to go home quickly.",
      "Press D to open the dashboard.",
      "Use the menu links to continue your workflow.",
    ];

    var hint = document.querySelector(".error-illustration__label");
    if (hint) {
      var index = new Date().getSeconds() % hints.length;
      hint.textContent = hints[index];
    }

    document.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();
      if (key === "h") {
        window.location.href = "index.html";
      }
      if (key === "d") {
        window.location.href = "dashboard.html";
      }
    });
  });
})();
