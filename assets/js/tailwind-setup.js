(function () {
  function applyStaggeredEntrance() {
    const selectors = [
      "main .card",
      "main .stat-card",
      "main .table-container",
      "main .upload-card",
      "main .payment-card",
      "main .review-detailscard",
      "main .support-hero",
      "main .page-header",
      "main .dashboard-header",
    ];

    const animated = document.querySelectorAll(selectors.join(", "));

    animated.forEach(function (element, index) {
      if (element.closest("#navbar-container") || element.closest("#sidebar-container")) {
        return;
      }

      element.classList.add("stagger-fade");
      element.style.setProperty("--stagger-delay", Math.min(index * 70, 630) + "ms");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStaggeredEntrance);
  } else {
    applyStaggeredEntrance();
  }
})();
