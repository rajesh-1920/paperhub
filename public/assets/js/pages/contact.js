document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (typeof showSuccess === "function") {
        showSuccess("Your message has been sent to support");
      }
      form.reset();
    });
  }
});
