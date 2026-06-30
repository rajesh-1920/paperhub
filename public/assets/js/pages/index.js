function navigateToAuth(page) {
  window.location.href = `pages/auth/${page}.html`;
}

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function handleContactForm(event) {
  event.preventDefault();

  if (typeof showToast === "function") {
    showToast("Thank you! We will contact you soon.", "success");
  }

  event.target.reset();
}

function applyLandingTheme() {
  const root = document.documentElement;

  try {
    const storedTheme = localStorage.getItem("paperhub-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = storedTheme ? storedTheme === "dark" : prefersDark;
    root.classList.toggle("dark", useDark);
  } catch (error) {
    console.warn("Unable to apply landing theme preference", error);
  }
}

// Toggle the mobile nav dropdown (shown only below the md breakpoint).
function setupMobileMenu() {
  const toggle = document.getElementById("landingMenuToggle");
  const menu = document.getElementById("landingMobileMenu");
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("hidden") === false;
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  // Close after choosing a link/action, or once the viewport reaches desktop.
  menu.querySelectorAll("a, button").forEach((el) => el.addEventListener("click", close));
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) close();
  });
}

window.navigateToAuth = navigateToAuth;
window.scrollToSection = scrollToSection;
window.handleContactForm = handleContactForm;

document.addEventListener("DOMContentLoaded", () => {
  applyLandingTheme();
  setupMobileMenu();
});
