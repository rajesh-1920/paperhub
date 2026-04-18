const defaultUserProfile = {
  name: "Rajesh Biswas",
  email: "rajesh18@cse.pstu.ac.bd",
  role: "student",
  avatar: "https://ui-avatars.com/api/?name=Rajesh+Biswas",
};

let currentUser = { ...defaultUserProfile };

async function initApp() {
  await ensureTailwindCDN();
  await ensureNavbarScript();

  loadComponentStyles();
  await loadComponents();

  initNavbar();
  initSidebar();

  setActiveSidebarItem();
}

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

function loadComponentStyles() {
  const styleFiles = [];

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

function initNavbar() {
  if (typeof window.initPaperHubNavbar === "function") {
    window.initPaperHubNavbar({
      user: currentUser,
    });
  }
}

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

function updateUserProfile(user) {
  const userNameElement = getElement(".user-name");
  const userAvatarElement = getElement(".user-avatar");

  if (userNameElement && user?.name) {
    userNameElement.textContent = user.name.split(" ")[0];
  }

  if (userAvatarElement && user?.avatar) {
    userAvatarElement.src = user.avatar;
  }

  if (typeof window.updatePaperHubNavbarUser === "function") {
    window.updatePaperHubNavbarUser(user);
  }

  currentUser = { ...currentUser, ...user };
}

function getCurrentUserProfile() {
  return currentUser;
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
