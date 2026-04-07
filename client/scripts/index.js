(function () {
  "use strict";

  function animateStat(element) {
    var raw = element.textContent.trim();
    var number = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(number)) {
      return;
    }

    var suffix = raw.replace(/[\d.]/g, "");
    var duration = 900;
    var startTime;

    function step(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = (number * progress).toFixed(raw.includes(".") ? 1 : 0);
      element.textContent = value + suffix;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = raw;
      }
    }

    window.requestAnimationFrame(step);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".landing-hero .card__title").forEach(animateStat);
  });
})();
