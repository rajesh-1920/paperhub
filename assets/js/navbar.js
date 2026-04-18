(function () {
  const ACTIVE_CLASSES = ["text-cyan-700", "bg-cyan-50", "dark:text-cyan-400", "dark:bg-slate-800"];
  const VALID_ROLES = ["student", "teacher", "admin"];
  const ROLE_STORAGE_KEY = "paperhub-role";
  const DEFAULT_USER = {
    name: "Rajesh Biswas",
    email: "rajesh18@cse.pstu.ac.bd",
    avatar: "https://ui-avatars.com/api/?name=Rajesh+Biswas",
  };

  function getStoredRole() {
    try {
      return localStorage.getItem(ROLE_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to read role from localStorage", error);
      return "student";
    }
  }

  function normalizeRole(role) {
    const safeRole = String(role || "student").toLowerCase();
    if (VALID_ROLES.includes(safeRole)) {
      return safeRole;
    }
    return "student";
  }

  function setUserRole(role) {
    const normalized = normalizeRole(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, normalized);
      return normalized;
    } catch (error) {
      console.warn("Unable to set user role", error);
      return normalized;
    }
  }

  function getUserProfile(role) {
    return {
      ...DEFAULT_USER,
      role: normalizeRole(role),
    };
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
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      roleBadge.textContent = roleLabel;
      roleBadge.className =
        "hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold sm:inline-flex transition-all duration-200";

      if (role === "admin") {
        roleBadge.classList.add("border-red-300", "bg-red-50", "text-red-700");
      } else if (role === "teacher") {
        roleBadge.classList.add("border-purple-300", "bg-purple-50", "text-purple-700");
      } else {
        roleBadge.classList.add("text-slate-600");
      }
    }

    const mobileRoleBadge = document.querySelector("[data-role-badge-mobile]");
    if (mobileRoleBadge) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      mobileRoleBadge.textContent = roleLabel;
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

  function setupRoleSwitcher() {
    const roleOptions = document.querySelectorAll("[data-role-option]");
    const currentRole = normalizeRole(getStoredRole());

    roleOptions.forEach((option) => {
      if (option.value === currentRole) {
        option.checked = true;
      }

      option.addEventListener("change", () => {
        const newRole = setUserRole(option.value);
        applyRoleVisibility(newRole);
        window.location.reload();
      });
    });
  }

  function setupMobileMenu() {
    const toggleButton = document.getElementById("navbarHamburger");
    const mobileMenu = document.getElementById("mobileMenu");

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
  }

  function setupUserDropdown() {
    const menuButton = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userDropdown");

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
  }

  function setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const mobileThemeToggle = document.getElementById("mobileThemeToggle");
    const root = document.documentElement;

    const getStoredTheme = () => {
      try {
        return localStorage.getItem("paperhub-theme");
      } catch (error) {
        console.warn("Unable to read theme preference", error);
        return null;
      }
    };

    const setStoredTheme = (theme) => {
      try {
        localStorage.setItem("paperhub-theme", theme);
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    };

    const applyTheme = (isDark, persist = false) => {
      root.classList.toggle("dark", isDark);
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      themeToggle?.setAttribute("aria-pressed", String(isDark));
      mobileThemeToggle?.setAttribute("aria-pressed", String(isDark));

      if (persist) {
        setStoredTheme(isDark ? "dark" : "light");
      }
    };

    const storedTheme = getStoredTheme();
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    applyTheme(shouldUseDark, false);

    if (!themeToggle && !mobileThemeToggle) {
      return;
    }

    themeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    mobileThemeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    if (!storedTheme && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (event) => {
        applyTheme(event.matches, false);
      });
    }
  }

  function updateUser(user) {
    const currentUser = user || getUserProfile(getStoredRole());
    const nameElement = document.querySelector(".user-name");
    const avatarElement = document.querySelector(".user-avatar");
    const emailElement = document.querySelector("[data-user-email]");

    if (nameElement && currentUser?.name) {
      nameElement.textContent = currentUser.name.split(" ")[0];
    }

    if (avatarElement && currentUser?.avatar) {
      avatarElement.src = currentUser.avatar;
      avatarElement.alt = currentUser.name || "User";
    }

    if (emailElement && currentUser?.email) {
      emailElement.textContent = currentUser.email;
    }
  }

  function initPaperHubNavbar(options = {}) {
    const navbar = document.getElementById("paperhubNavbar");
    if (!navbar) {
      return;
    }

    const role = normalizeRole(options.user?.role || getStoredRole());
    const currentUser = options.user || getUserProfile(role);

    applyRoleVisibility(role);
    markActiveLink();
    setupMobileMenu();
    setupUserDropdown();
    setupThemeToggle();
    setupRoleSwitcher();
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
