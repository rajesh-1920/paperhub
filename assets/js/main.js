/**
 * PaperHub - Main Application JS
 * Handles component loading and global app initialization
 */

// Store currently logged in user
let currentUser = null;

/**
 * Initialize application
 */
async function initApp() {
  // Check if user is logged in
  const session = getSession();

  if (session) {
    currentUser = session.user;
    console.log("User logged in:", currentUser);
  } else {
    // Redirect to login if on protected page
    const protectedPages = ["dashboard", "file", "review", "payment"];
    const currentPath = window.location.pathname;
    const isProtected = protectedPages.some((page) => currentPath.includes(page));

    if (isProtected) {
      window.location.href = "/pages/auth/login.html";
    }
  }

  // Ensure navbar runtime dependencies are available
  await ensureTailwindCDN();
  await ensureNavbarScript();

  // Load component styles and HTML
  loadComponentStyles();
  await loadComponents();

  // Initialize component interactivity
  initNavbar();
  initSidebar();

  // Set active sidebar item based on current page
  setActiveSidebarItem();
}

/**
 * Load Tailwind CSS CDN script once
 */
async function ensureTailwindCDN() {
  if (window.tailwind && document.querySelector('script[data-paperhub-tailwind="true"]')) {
    return;
  }

  if (!document.getElementById("paperhub-tailwind-config")) {
    const configScript = document.createElement("script");
    configScript.id = "paperhub-tailwind-config";
    configScript.textContent = `
      window.tailwind = window.tailwind || {};
      window.tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            boxShadow: {
              soft: '0 8px 24px rgba(15, 23, 42, 0.08)'
            }
          }
        }
      };
    `;
    document.head.appendChild(configScript);
  }

  if (!document.querySelector('script[data-paperhub-tailwind="true"]')) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.dataset.paperhubTailwind = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn("Unable to load Tailwind CDN. Navbar may not be fully styled.");
        resolve();
      };
      document.head.appendChild(script);
    });
  }
}

/**
 * Load navbar module once
 */
async function ensureNavbarScript() {
  if (typeof window.initPaperHubNavbar === "function") {
    return;
  }

  if (!document.querySelector('script[data-paperhub-navbar="true"]')) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/assets/js/navbar.js";
      script.dataset.paperhubNavbar = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn("Unable to load navbar module.");
        resolve();
      };
      document.body.appendChild(script);
    });
  }
}

/**
 * Load component styles once (navbar, sidebar, footer)
 */
function loadComponentStyles() {
  const styleFiles = ["/assets/css/components/sidebar.css", "/assets/css/components/footer.css"];

  styleFiles.forEach((href) => {
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  });
}

/**
 * Load components (navbar, sidebar, footer) into page
 */
async function loadComponents() {
  const componentsToLoad = [
    { id: "navbar-container", file: "/components/navbar.html" },
    { id: "sidebar-container", file: "/components/sidebar.html" },
    { id: "footer-container", file: "/components/footer.html" },
  ];

  for (const component of componentsToLoad) {
    const container = getElement("#" + component.id);
    if (container) {
      try {
        const response = await fetch(component.file);
        const html = await response.text();
        container.innerHTML = html;
      } catch (error) {
        console.error(`Error loading ${component.file}:`, error);
      }
    }
  }
}

/**
 * Initialize navbar interactions
 */
function initNavbar() {
  if (typeof window.initPaperHubNavbar === "function") {
    window.initPaperHubNavbar({
      user: currentUser,
      onLogout: logout,
    });
  }
}

/**
 * Initialize sidebar interactions
 */
function initSidebar() {
  const sidebarToggle = getElement("#sidebarToggle");
  const sidebar = getElement("#sidebar");
  const sidebarClose = getElement("#sidebarClose");
  const sidebarOverlay = getElement("#sidebarOverlay");

  if (sidebarToggle && sidebar) {
    addEvent(sidebarToggle, "click", () => {
      addClass(sidebar, "sidebar-mobile-open");
      addClass(sidebarOverlay, "active");
    });
  }

  if (sidebarClose && sidebar) {
    addEvent(sidebarClose, "click", () => {
      removeClass(sidebar, "sidebar-mobile-open");
      removeClass(sidebarOverlay, "active");
    });
  }

  if (sidebarOverlay && sidebar) {
    addEvent(sidebarOverlay, "click", () => {
      removeClass(sidebar, "sidebar-mobile-open");
      removeClass(sidebarOverlay, "active");
    });
  }

  // Close sidebar on link click (mobile)
  const sidebarItems = getElements(".sidebar-item");
  sidebarItems.forEach((item) => {
    addEvent(item, "click", () => {
      if (window.innerWidth <= 768) {
        removeClass(sidebar, "sidebar-mobile-open");
        removeClass(sidebarOverlay, "active");
      }
    });
  });
}

/**
 * Set active sidebar item based on current page
 */
function setActiveSidebarItem() {
  const currentPath = window.location.pathname;
  const sidebarItems = getElements(".sidebar-item");

  sidebarItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (href && currentPath.includes(href)) {
      addClass(item, "active");
    } else {
      removeClass(item, "active");
    }
  });
}

/**
 * Logout user
 */
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    clearSession();
    showSuccess("Logged out successfully");
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  }
}

/**
 * Update user profile in navbar
 */
function updateUserProfile(user) {
  const userNameElement = getElement(".user-name");
  const userAvatarElement = getElement(".user-avatar");

  if (userNameElement && user.name) {
    userNameElement.textContent = user.name.split(" ")[0];
  }

  if (userAvatarElement && user.avatar) {
    userAvatarElement.src = user.avatar;
  }

  if (typeof window.updatePaperHubNavbarUser === "function") {
    window.updatePaperHubNavbarUser(user);
  }

  currentUser = user;
}

/**
 * Get current user
 */
function getCurrentUserProfile() {
  return currentUser || getCurrentUser();
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
