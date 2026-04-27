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

window.navigateToAuth = navigateToAuth;
window.scrollToSection = scrollToSection;
window.handleContactForm = handleContactForm;

document.addEventListener("DOMContentLoaded", applyLandingTheme);
