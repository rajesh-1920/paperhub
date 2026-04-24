# PaperHub Frontend

Professional static frontend for a SaaS-style document management platform.

Built with HTML5, Tailwind CSS, and Vanilla JavaScript.

## Purpose

This repository contains the complete client-side application.

- Runtime application root: `public/`
- Tailwind source stylesheet: `src/css/input.css`
- Generated stylesheet: `public/assets/css/tailwind.css`

## Technology Stack

- HTML5
- Tailwind CSS
- Vanilla JavaScript
- Node.js tooling for build and local serving

## Project Structure

```text
paperhub/
├── public/
│   ├── index.html
│   ├── components/
│   │   ├── footer.html
│   │   ├── navbar.html
│   │   └── sidebar.html
│   ├── pages/
│   │   ├── account/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── errors/
│   │   ├── file/
│   │   ├── payment/
│   │   ├── review/
│   │   └── support/
│   └── assets/
│       ├── css/
│       │   └── tailwind.css
│       ├── images/
│       │   ├── file.png
│       │   └── logo.svg
│       └── js/
│           ├── app.js
│           ├── auth.js
│           ├── file.js
│           ├── main.js
│           ├── navbar.js
│           ├── review.js
│           ├── sidebar.js
│           ├── tailwind-setup.js
│           ├── utils.js
│           └── pages/
├── src/
│   └── css/
│       └── input.css
├── package.json
├── package-lock.json
└── tailwind.config.js
```

## Prerequisites

- Node.js 18+
- npm 9+

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Build CSS

```bash
npm run build:css
```

3. Run local server

```bash
npm run serve
```

4. Open in browser

```text
http://127.0.0.1:8000
```

## NPM Scripts

- `npm run build:css` : Build Tailwind CSS once
- `npm run watch:css` : Watch and rebuild Tailwind CSS
- `npm run serve` : Serve `public/` on port 8000
- `npm run dev` : Serve `public/` with cache disabled and auto-open browser
- `npm start` : Run CSS watch and server together

## User Manual

### Main Routes

- Home: `public/index.html`
- Authentication: `public/pages/auth/`
- Dashboard: `public/pages/dashboard/`
- File management: `public/pages/file/`
- Review workflow: `public/pages/review/`
- Payment: `public/pages/payment/`
- Account settings: `public/pages/account/`
- Support: `public/pages/support/`

### Styling Workflow

1. Update styles in `src/css/input.css`
2. Run `npm run build:css` for one-time build or `npm run watch:css` during development
3. Confirm output at `public/assets/css/tailwind.css`

### JavaScript Responsibilities

- `public/assets/js/app.js` : App bootstrap and shared startup flow
- `public/assets/js/utils.js` : Reusable helper utilities
- `public/assets/js/auth.js` : Authentication behavior
- `public/assets/js/file.js` : File feature interactions
- `public/assets/js/review.js` : Review flow interactions
- `public/assets/js/navbar.js` and `public/assets/js/sidebar.js` : Layout interactions

## Deployment

Deploy the `public/` directory to any static hosting provider.

Recommended deployment flow:

```bash
npm install
npm run build:css
```

Publish only the `public/` folder.

## Troubleshooting

### Error: tailwindcss not found

Run:

```bash
npm install
```

### CSS changes are not visible

- Re-run `npm run build:css`
- Check that `public/assets/css/tailwind.css` was regenerated
- Hard refresh browser

### Port 8000 already in use

Run with another port:

```bash
npx http-server public -p 8080
```

## Maintenance Notes

- `node_modules/` is local and should not be committed
- Runtime content lives in `public/`
- Source CSS is maintained in `src/css/input.css`
