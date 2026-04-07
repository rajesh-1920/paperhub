(function () {
  "use strict";

  var THEME_KEY = "paperhub-theme";
  var toastRoot;

  function getPreferredTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return "system";
  }

  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === "light" || mode === "dark") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function getEffectiveTheme(mode) {
    if (mode === "light" || mode === "dark") {
      return mode;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function createThemeToggle() {
    var navbarRight = document.querySelector(".top-navbar__right");
    if (!navbarRight || navbarRight.querySelector(".theme-toggle-btn")) {
      return;
    }

    var button = document.createElement("button");
    button.className = "icon-btn theme-toggle-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Toggle theme");
    button.setAttribute("title", "Toggle light and dark theme");

    var mode = getPreferredTheme();

    function syncButtonState() {
      var effective = getEffectiveTheme(mode);
      button.setAttribute("aria-pressed", String(effective === "dark"));
      button.textContent = effective === "dark" ? "L" : "D";
    }

    button.addEventListener("click", function () {
      var effective = getEffectiveTheme(mode);
      mode = effective === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, mode);
      applyTheme(mode);
      syncButtonState();
      showToast("Theme switched to " + mode + " mode.");
    });

    applyTheme(mode);
    syncButtonState();
    navbarRight.prepend(button);
  }

  function initUserMenu() {
    var menus = document.querySelectorAll(".user-menu");
    if (!menus.length) {
      return;
    }

    menus.forEach(function (menu) {
      var trigger = menu.querySelector(".user-menu__trigger");
      if (!trigger) {
        return;
      }
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        var shouldOpen = !menu.classList.contains("is-open");
        menus.forEach(function (m) {
          m.classList.remove("is-open");
          var t = m.querySelector(".user-menu__trigger");
          if (t) {
            t.setAttribute("aria-expanded", "false");
          }
        });
        if (shouldOpen) {
          menu.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", function () {
      menus.forEach(function (menu) {
        menu.classList.remove("is-open");
        var trigger = menu.querySelector(".user-menu__trigger");
        if (trigger) {
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function initSidebarToggle() {
    var shell = document.querySelector(".app-shell");
    var toggles = document.querySelectorAll('button[aria-label="Toggle sidebar"]');
    if (!shell || !toggles.length) {
      return;
    }

    var media = window.matchMedia("(max-width: 920px)");

    function closeMobileSidebar() {
      document.body.classList.remove("sidebar-mobile-open");
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        if (media.matches) {
          document.body.classList.toggle("sidebar-mobile-open");
          return;
        }
        shell.classList.toggle("is-sidebar-collapsed");
      });
    });

    document.querySelectorAll(".sidebar .side-nav-link").forEach(function (link) {
      link.addEventListener("click", closeMobileSidebar);
    });

    document.addEventListener("click", function (event) {
      if (!media.matches || !document.body.classList.contains("sidebar-mobile-open")) {
        return;
      }
      var sidebar = document.querySelector(".sidebar");
      if (!sidebar) {
        return;
      }
      var clickedToggle = event.target.closest('button[aria-label="Toggle sidebar"]');
      if (clickedToggle || sidebar.contains(event.target)) {
        return;
      }
      closeMobileSidebar();
    });

    window.addEventListener("resize", function () {
      if (!media.matches) {
        closeMobileSidebar();
      }
    });
  }

  function initSearch() {
    var searchInputs = document.querySelectorAll(".search-field__input");
    if (!searchInputs.length) {
      return;
    }

    searchInputs.forEach(function (input) {
      input.addEventListener("input", function () {
        var query = input.value.trim().toLowerCase();
        applySearchFilter(query);
      });
    });
  }

  function applySearchFilter(query) {
    var tableRows = Array.from(document.querySelectorAll(".table tbody tr"));
    var activityItems = Array.from(document.querySelectorAll(".activity-item"));
    var profileItems = Array.from(document.querySelectorAll(".profile-info-item, .settings-item"));
    var targetItems = tableRows.length
      ? tableRows
      : activityItems.length
        ? activityItems
        : profileItems;

    if (!targetItems.length) {
      return;
    }

    var visible = 0;
    targetItems.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = !query || text.indexOf(query) !== -1;
      item.style.display = match ? "" : "none";
      if (match) {
        visible += 1;
      }
    });

    updateEmptyState(visible === 0 && Boolean(query), query, targetItems[0]);
  }

  function updateEmptyState(show, query, anchorNode) {
    var existing = document.querySelector(".search-empty-state");
    if (!show) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    if (!existing) {
      existing = document.createElement("p");
      existing.className = "search-empty-state section__hint";
      anchorNode.closest(".card__body, .card").appendChild(existing);
    }
    existing.textContent = 'No results for "' + query + '".';
  }

  function initNotifications() {
    document.querySelectorAll(".notification-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        showToast("No new notifications right now.");
      });
    });
  }

  function initAnchorLinks() {
    document.querySelectorAll('a[href="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        event.preventDefault();
        showToast("This action can be connected to backend APIs later.");
      });
    });
  }

  function initReveal() {
    if (!window.IntersectionObserver) {
      return;
    }
    var nodes = document.querySelectorAll(".card, .activity-item");
    if (!nodes.length) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 },
    );

    nodes.forEach(function (node, index) {
      node.classList.add("ui-reveal");
      node.style.transitionDelay = Math.min(index * 30, 220) + "ms";
      observer.observe(node);
    });
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 KB";
    }
    var units = ["B", "KB", "MB", "GB"];
    var index = Math.floor(Math.log(bytes) / Math.log(1024));
    var value = bytes / Math.pow(1024, index);
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
  }

  function ensureToastRoot() {
    if (toastRoot) {
      return toastRoot;
    }
    toastRoot = document.createElement("div");
    toastRoot.className = "toast-region";
    toastRoot.setAttribute("aria-live", "polite");
    toastRoot.setAttribute("aria-label", "Notifications");
    document.body.appendChild(toastRoot);
    return toastRoot;
  }

  function showToast(message) {
    var root = ensureToastRoot();
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    root.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2200);
  }

  function initKeyboardShortcuts() {
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.body.classList.remove("sidebar-mobile-open");
        document.querySelectorAll(".user-menu.is-open").forEach(function (menu) {
          menu.classList.remove("is-open");
        });
      }
    });
  }

  window.PaperHubUI = {
    showToast: showToast,
    formatFileSize: formatFileSize,
  };

  document.addEventListener("DOMContentLoaded", function () {
    createThemeToggle();
    initUserMenu();
    initSidebarToggle();
    initSearch();
    initNotifications();
    initAnchorLinks();
    initReveal();
    initKeyboardShortcuts();
  });
})();
