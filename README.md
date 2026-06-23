# PaperHub

PaperHub is a static SaaS-style document management frontend built with HTML, Tailwind CSS, and vanilla JavaScript. It includes a public landing page, role-based auth pages, dashboards for users/officers/admins, file and review workflows, payment screens, account pages, and shared navigation components.

## Project Layout

```text
paperhub/
├── public/
│   ├── index.html
│   ├── components/
│   ├── pages/
│   └── assets/
├── src/
│   └── css/
├── package.json
├── tailwind.config.js
└── README.md
```

## Key Files

- `public/index.html` - SaaS landing page
- `public/components/` - Shared navbar, sidebar, and footer partials
- `public/pages/` - Auth, dashboard, file, payment, review, account, support, and error pages
- `public/assets/js/` - App bootstrap, auth, dashboard, review, file, and shared utilities
- `public/assets/css/` - Generated Tailwind CSS plus page/component styles
- `src/css/input.css` - Tailwind source stylesheet

## NPM Scripts

- `npm run build:css` - Build Tailwind CSS once
- `npm run watch:css` - Rebuild Tailwind CSS on changes
- `npm run serve` - Serve `public/` on port 8000
- `npm run dev` - Serve `public/` with cache disabled and auto-open the browser
- `npm start` - Run CSS watch and server together

## Notes

- Runtime files live in `public/`
- Source styles live in `src/css/input.css`
- The app is designed to run as a static frontend
