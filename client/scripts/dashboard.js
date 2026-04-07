(function () {
  "use strict";

  function animateValue(element) {
    var text = element.textContent.trim();
    var number = parseFloat(text.replace(/,/g, "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(number)) {
      return;
    }

    var hasPercent = text.indexOf("%") !== -1;
    var hasComma = text.indexOf(",") !== -1;
    var decimals = text.includes(".") ? 1 : 0;
    var duration = 1200;
    var start;

    function frame(time) {
      if (!start) {
        start = time;
      }
      var progress = Math.min((time - start) / duration, 1);
      var current = number * progress;
      var rendered = current.toFixed(decimals);
      if (hasComma) {
        rendered = Number(rendered).toLocaleString();
      }
      element.textContent = rendered + (hasPercent ? "%" : "");

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        element.textContent = text;
      }
    }

    window.requestAnimationFrame(frame);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".dashboard-kpi .card__title").forEach(animateValue);
  });
})();
