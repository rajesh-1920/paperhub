(function () {
  function ensureTailwindConfig() {
    if (document.getElementById("paperhub-tailwind-config")) {
      return;
    }

    const configScript = document.createElement("script");
    configScript.id = "paperhub-tailwind-config";
    configScript.textContent = `
      window.tailwind = window.tailwind || {};
      window.tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            fontFamily: {
              sans: ['Manrope', 'sans-serif'],
              display: ['Sora', 'sans-serif']
            },
            boxShadow: {
              panel: '0 18px 45px rgba(15,23,42,0.12)',
              soft: '0 8px 24px rgba(15,23,42,0.08)'
            }
          }
        }
      };
    `;
    document.head.appendChild(configScript);
  }

  function ensureTailwindCdn() {
    if (document.querySelector('script[data-paperhub-tailwind="true"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    script.dataset.paperhubTailwind = "true";
    script.onerror = function () {
      console.warn("Tailwind CDN failed to load.");
    };
    document.head.appendChild(script);
  }

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

  ensureTailwindConfig();
  ensureTailwindCdn();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStaggeredEntrance);
  } else {
    applyStaggeredEntrance();
  }
})();
