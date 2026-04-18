(function () {
  const ACTIVE_CLASSES = ["text-sky-600", "bg-sky-50", "dark:text-sky-300", "dark:bg-slate-800"];

  function getSessionUser() {
    if (typeof getSession === "function") {
      const session = getSession();
      return session?.user || null;
    }

    try {
      const raw = localStorage.getItem("session");
      return raw ? JSON.parse(raw)?.user || null : null;
    } catch (error) {
      console.warn("Unable to parse session from localStorage", error);
      return null;
    }
  }

  function normalizeRole(role) {
    const safeRole = String(role || "user").toLowerCase();
    if (["admin", "officer", "user"].includes(safeRole)) {
      return safeRole;
    }
    return "user";
  }

  function applyRoleVisibility(role) {
    const roleElements = document.querySelectorAll("[data-roles]");

    roleElements.forEach((element) => {
      const roles = element.dataset.roles
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      const canView = roles.length === 0 || roles.includes(role);
      element.classList.toggle("hidden", !canView);
    });

    const roleBadge = document.querySelector("[data-role-badge]");
    if (roleBadge) {
      roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }

    const mobileRoleBadge = document.querySelector("[data-role-badge-mobile]");
    if (mobileRoleBadge) {
      mobileRoleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }
  }

  function markActiveLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll("[data-nav-link]");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const isHome = href === "/";
      const isMatch = isHome
        ? currentPath === "/" || currentPath.endsWith("index.html")
        : currentPath.includes(href);

      link.removeAttribute("aria-current");
      ACTIVE_CLASSES.forEach((className) => link.classList.remove(className));

      if (isMatch) {
        link.setAttribute("aria-current", "page");
        ACTIVE_CLASSES.forEach((className) => link.classList.add(className));
      }
    });
  }

  function setupMobileMenu() {
    const toggleButton = document.getElementById("navbarHamburger");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileThemeToggle = document.getElementById("mobileThemeToggle");

    if (!toggleButton || !mobileMenu) {
      return;
    }

    const closeMenu = () => {
      mobileMenu.classList.add("hidden");
      toggleButton.setAttribute("aria-expanded", "false");
    };

    toggleButton.addEventListener("click", () => {
      const isOpen = !mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden", isOpen);
      toggleButton.setAttribute("aria-expanded", String(!isOpen));
    });

    mobileMenu.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener("click", () => {
        const root = document.documentElement;
        const isDark = root.classList.toggle("dark");
        document.getElementById("themeToggle")?.setAttribute("aria-pressed", String(isDark));
        mobileThemeToggle.setAttribute("aria-pressed", String(isDark));
        localStorage.setItem("paperhub-theme", isDark ? "dark" : "light");
      });
    }
  }

  function setupUserDropdown(onLogout) {
    const menuButton = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userDropdown");
    const logoutButton = document.getElementById("logoutBtn");

    if (menuButton && menu) {
      menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = !menu.classList.contains("hidden");
        menu.classList.toggle("hidden", isOpen);
        menuButton.setAttribute("aria-expanded", String(!isOpen));
      });

      document.addEventListener("click", (event) => {
        if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
          menu.classList.add("hidden");
          menuButton.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", (event) => {
        event.preventDefault();
        if (typeof onLogout === "function") {
          onLogout();
        }
      });
    }
  }

  function setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const mobileThemeToggle = document.getElementById("mobileThemeToggle");

    if (!themeToggle && !mobileThemeToggle) {
      return;
    }

    const root = document.documentElement;
    const storedTheme = localStorage.getItem("paperhub-theme");
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    root.classList.toggle("dark", shouldUseDark);
    themeToggle?.setAttribute("aria-pressed", String(shouldUseDark));
    mobileThemeToggle?.setAttribute("aria-pressed", String(shouldUseDark));

    themeToggle?.addEventListener("click", () => {
      const isDark = root.classList.toggle("dark");
      themeToggle.setAttribute("aria-pressed", String(isDark));
      mobileThemeToggle?.setAttribute("aria-pressed", String(isDark));
      localStorage.setItem("paperhub-theme", isDark ? "dark" : "light");
    });
  }

  function updateUser(user) {
    const currentUser = user || getSessionUser();
    const nameElement = document.querySelector(".user-name");
    const avatarElement = document.querySelector(".user-avatar");

    if (nameElement && currentUser?.name) {
      nameElement.textContent = currentUser.name.split(" ")[0];
    }

    if (avatarElement && currentUser?.avatar) {
      avatarElement.src = currentUser.avatar;
      avatarElement.alt = currentUser.name || "User";
    }
  }

  function initPaperHubNavbar(options = {}) {
    const navbar = document.getElementById("paperhubNavbar");
    if (!navbar) {
      return;
    }

    const currentUser = options.user || getSessionUser();
    const role = normalizeRole(currentUser?.role);

    applyRoleVisibility(role);
    markActiveLink();
    setupMobileMenu();
    setupUserDropdown(options.onLogout);
    setupThemeToggle();
    updateUser(currentUser);

    document.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", () => {
        const mobileMenu = document.getElementById("mobileMenu");
        const toggleButton = document.getElementById("navbarHamburger");
        if (mobileMenu && toggleButton) {
          mobileMenu.classList.add("hidden");
          toggleButton.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  window.initPaperHubNavbar = initPaperHubNavbar;
  window.updatePaperHubNavbarUser = updateUser;
})();
