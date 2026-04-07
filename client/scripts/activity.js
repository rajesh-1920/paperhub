(function () {
  "use strict";

  function addNewTag(item) {
    item.classList.add("is-new");
    window.setTimeout(function () {
      item.classList.remove("is-new");
    }, 1800);
  }

  function prependDemoEvent() {
    var timeline = document.querySelector(".activity-timeline");
    if (!timeline) {
      return;
    }

    var card = document.createElement("article");
    card.className = "activity-item activity-item--update";
    card.setAttribute("role", "listitem");
    card.innerHTML =
      '<div class="activity-item__top">' +
      '  <div class="activity-item__event">' +
      '    <span class="activity-item__icon">N</span>' +
      "    <span>Live Feed Synced</span>" +
      "  </div>" +
      '  <time class="activity-item__time">Just now</time>' +
      "</div>" +
      '<p class="activity-item__description">Audit activity feed refreshed successfully.</p>' +
      '<div class="activity-item__meta"><span class="badge badge--active">System</span></div>';

    timeline.prepend(card);
    addNewTag(card);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var liveBadge = document.querySelector(".badge.badge--active");
    if (liveBadge) {
      liveBadge.setAttribute("title", "Click to refresh feed");
      liveBadge.style.cursor = "pointer";
      liveBadge.addEventListener("click", function () {
        prependDemoEvent();
        if (window.PaperHubUI) {
          window.PaperHubUI.showToast("Activity feed refreshed.");
        }
      });
    }
  });
})();
