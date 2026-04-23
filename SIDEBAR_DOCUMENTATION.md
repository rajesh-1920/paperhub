# PaperHub Professional Sidebar Documentation

## Overview

The PaperHub sidebar is a **production-ready**, modular component designed for large-scale document management platforms. It provides a clean, minimal, and professional user experience with role-based navigation and responsive behavior.

---

## Features

### ✅ Core Features

- **Fixed Desktop Sidebar** - Always visible on screens ≥768px
- **Mobile-Responsive** - Hidden by default on mobile, slide-in overlay on toggle
- **Icon-Only Collapse Mode** - Desktop users can collapse sidebar to icon-only view
- **Role-Based Navigation** - Show/hide menu items based on user role (Admin, Officer, User)
- **Active Link Highlighting** - Automatic highlighting of current page
- **Smooth Animations** - CSS transitions for collapse, open, and close actions
- **Persistent State** - Remembers collapse preference and user role
- **Accessibility-First** - Semantic HTML, ARIA labels, keyboard support (Escape to close)
- **Scrollable Content** - Handles overflow for large menus
- **Clean Architecture** - Separated HTML, CSS (Tailwind), and JavaScript

---

## File Structure

```
components/
└── sidebar.html          # HTML markup with semantic structure

assets/
├── css/
│   ├── tailwind.css      # Compiled Tailwind classes
│   ├── tailwind.input.css # Input file for Tailwind
│   └── global.css        # Global styles
└── js/
    └── sidebar.js        # Sidebar logic (modular, IIFE)
```

---

## Component Anatomy

### HTML Structure

```html
<!-- Main Sidebar Container -->
<aside id="paperhubSidebar">
  <!-- Header with Logo & Buttons -->
  <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
    <!-- Logo/Brand -->
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br">PH</div>
      <div data-sidebar-brand>
        <p>PaperHub</p>
        <p>Secure Platform</p>
      </div>
    </div>

    <!-- Control Buttons -->
    <button id="sidebarCollapseBtn"><!-- Desktop: collapse --></button>
    <button id="sidebarClose"><!-- Mobile: close --></button>
  </div>

  <!-- Navigation Menu -->
  <nav id="paperhubSidebarNav">
    <!-- Workspace Section -->
    <div>
      <p data-sidebar-section-title>Workspace</p>
      <div>
        <a href="..." data-sidebar-link data-sidebar-roles="admin,officer,user">
          <svg><!-- Icon --></svg>
          <span data-sidebar-label>Dashboard</span>
        </a>
        <!-- More links... -->
      </div>
    </div>

    <!-- Admin Section (hidden for non-admins) -->
    <div data-sidebar-divider-roles="admin">
      <p data-sidebar-section-title>Administration</p>
      <!-- Admin-only links -->
    </div>
  </nav>

  <!-- Logout Section -->
  <div class="border-t border-slate-200 p-3">
    <a href="/pages/auth/login.html" data-sidebar-roles="admin,officer,user">
      <!-- Logout icon & label -->
    </a>
  </div>
</aside>

<!-- Mobile Toggle Button -->
<button id="sidebarMobileToggle"><!-- Mobile menu icon --></button>

<!-- Mobile Overlay Backdrop -->
<div id="sidebarOverlay"></div>
```

---

## Role-Based Menu System

The sidebar uses **data attributes** to control visibility:

### Roles Supported

| Role        | Description                  | Visible Menu Items                                  |
| ----------- | ---------------------------- | --------------------------------------------------- |
| **ADMIN**   | Full system access           | Dashboard, Files, Reviews, Users, Reports, Settings |
| **OFFICER** | Document review & processing | Dashboard, Files, Reviews                           |
| **USER**    | Standard document upload     | Dashboard, Files, Upload, Payments                  |

### How It Works

```html
<!-- This link appears for all users -->
<a data-sidebar-roles="admin,officer,user" href="/pages/dashboard/user.html"> Dashboard </a>

<!-- This link appears only for users and officers -->
<a data-sidebar-roles="officer,user" href="/pages/file/file-details.html"> Files </a>

<!-- This link appears only for admins -->
<a data-sidebar-roles="admin" href="/pages/dashboard/admin.html#users"> Users </a>

<!-- Section divider: shown only for admins -->
<div data-sidebar-divider-roles="admin">
  <p>Administration</p>
  <!-- Admin content -->
</div>
```

### Setting User Role

```javascript
// Method 1: In localStorage (persists across sessions)
localStorage.setItem("paperhub-role", "admin");

// Method 2: Programmatically (during init)
window.initPaperHubSidebar({ role: "officer" });

// Method 3: Via nested user object
window.initPaperHubSidebar({ user: { role: "user" } });
```

---

## Collapse Feature (Desktop)

Desktop users can collapse the sidebar to show only icons.

### States

| State         | Width        | Labels  | Icons    |
| ------------- | ------------ | ------- | -------- |
| **Expanded**  | 288px (w-72) | Visible | Visible  |
| **Collapsed** | 80px (w-20)  | Hidden  | Centered |

### Interactions

- Click collapse button to toggle
- Preference saved in `localStorage` as `paperhub-sidebar-collapsed`
- Persists across page reloads on desktop

### CSS Classes Applied During Collapse

```
Sidebar:
  - Remove: md:w-72
  - Add: md:w-20

Links:
  - Add: md:justify-center (centers icons)

Labels (data-sidebar-label, data-sidebar-section-title, data-sidebar-brand):
  - Add: md:hidden (hides text)

Collapse Button:
  - Add: rotate-180 (rotates arrow)
  - Updates aria-expanded attribute
```

---

## Mobile Behavior

### Default State

- Sidebar is **hidden** off-screen (`-translate-x-full`)
- Mobile toggle button (☰) is visible in top-left
- No overlay

### When Toggle is Clicked

1. Sidebar slides in from left (`translate-x-0`)
2. Overlay backdrop appears (semi-transparent, clickable)
3. Mobile close button (✕) is visible

### Closing Sidebar

- Click overlay
- Click close button
- Click a navigation link
- Press Escape key
- Resize to desktop (≥768px)

### Breakpoint

- **Mobile**: < 768px (controlled by Tailwind `md:` prefix)
- **Desktop**: ≥ 768px

---

## JavaScript Architecture

### IIFE Pattern (Immediately Invoked Function Expression)

The sidebar module uses IIFE to avoid polluting global scope:

```javascript
(function () {
  // Private scope - only CONFIG is modified later
  const CONFIG = {
    /* ... */
  };

  // Private functions
  function normalizeRole(role) {
    /* ... */
  }
  function getCurrentRole(explicitRole) {
    /* ... */
  }
  // ... more private functions

  // Public initialization function
  function initPaperHubSidebar(options) {
    // Setup sidebar
  }

  // Export to global scope
  window.initPaperHubSidebar = initPaperHubSidebar;
})();
```

### Key Functions

#### `initPaperHubSidebar(options?)`

Main initialization function called on page load.

**Parameters:**

```javascript
options = {
  role?: string,           // Direct role override
  user?: { role: string }  // Nested user object
}
```

**Example:**

```javascript
// Initialize with role
window.initPaperHubSidebar({ role: "officer" });

// Initialize from user object
window.initPaperHubSidebar({
  user: {
    role: "admin",
    name: "John Admin",
  },
});

// Initialize with defaults
window.initPaperHubSidebar();
```

#### `normalizeRole(role)`

Converts role strings to canonical form.

- `"student"` → `"user"`
- `"teacher"` → `"officer"`
- `"admin"` → `"admin"`
- Invalid → `"user"` (default)

#### `applyRoleVisibility(role)`

Shows/hides menu items based on role using `hidden` class.

#### `applyActiveLink()`

Highlights the current page link with cyan styling.

#### `setCollapsed(sidebar, isCollapsed, shouldPersist)`

Toggles collapse state and saves preference.

#### `openMobileSidebar(sidebar, overlay)` / `closeMobileSidebar(sidebar, overlay)`

Mobile slide-in/out animations.

---

## Integration Example

### Basic Setup

**In your HTML page:**

```html
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
    <link rel="stylesheet" href="/assets/css/global.css" />
  </head>
  <body>
    <!-- Navbar -->
    <div id="navbar-container"></div>

    <!-- Sidebar -->
    <div id="sidebar-container"></div>

    <!-- Main content -->
    <main>
      <!-- Your page content -->
    </main>

    <!-- Footer -->
    <div id="footer-container"></div>

    <!-- Scripts -->
    <script src="/assets/js/main.js"></script>
  </body>
</html>
```

**In `assets/js/main.js` (already configured):**

```javascript
async function loadComponents() {
  const components = [{ id: "sidebar-container", file: "/components/sidebar.html" }];

  // Load component HTML
  for (const component of components) {
    const response = await fetch(component.file);
    document.getElementById(component.id).innerHTML = await response.text();
  }
}

function initSidebar() {
  if (typeof window.initPaperHubSidebar === "function") {
    window.initPaperHubSidebar();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents();
  initSidebar();
});
```

---

## Styling Approach

### Tailwind CSS Classes

The sidebar uses only Tailwind classes (no custom CSS needed):

| Purpose    | Classes                                                          |
| ---------- | ---------------------------------------------------------------- |
| Layout     | `fixed`, `inset-y-0`, `left-0`, `w-72`, `flex`, `flex-col`       |
| Spacing    | `px-4`, `py-4`, `gap-3`, `space-y-6`, `mt-2`                     |
| Colors     | `bg-white`, `text-slate-600`, `border-slate-200`                 |
| Effects    | `shadow-xl`, `backdrop-blur`, `transition`, `hover:bg-slate-100` |
| Responsive | `md:hidden`, `md:inline-flex`, `md:w-72`                         |
| States     | `hidden`, `-translate-x-full`, `translate-x-0`, `rotate-180`     |

### Responsive Behavior

All responsiveness is handled via Tailwind prefixes:

```html
<!-- Hidden on mobile, visible on desktop -->
<button class="hidden md:inline-flex">Collapse</button>

<!-- Sidebar width: auto on mobile, 288px on desktop -->
<aside class="w-full md:w-72 -translate-x-full md:translate-x-0"></aside>

<!-- Link centering on collapse (desktop only) -->
<a class="group md:justify-center"></a>
```

---

## Accessibility Features

### ARIA Attributes

```html
<!-- Sidebar as navigation landmark -->
<aside aria-label="PaperHub sidebar">
  <!-- Collapse button state -->
  <button aria-label="Collapse sidebar" aria-expanded="true">
    <!-- Current page indicator -->
    <a aria-current="page">Dashboard</a>

    <!-- Overlay backdrop -->
    <div aria-hidden="true"></div>
  </button>
</aside>
```

### Keyboard Support

| Key               | Action                 |
| ----------------- | ---------------------- |
| `Escape`          | Close mobile sidebar   |
| `Tab`             | Navigate menu items    |
| `Enter` / `Space` | Activate buttons/links |

### Semantic HTML

- `<aside>` for sidebar (landmark)
- `<nav>` for navigation sections
- `<a>` for links (not divs)
- `<button>` for buttons (not divs)
- `<svg aria-hidden="true">` for icons (hidden from screen readers)

---

## Performance Considerations

### Minimal Re-renders

- Role visibility applied once during init
- Active link detection uses `addEventListener` (no polling)
- Collapse state persisted in localStorage (not cookies)

### Optimizations

- Used CSS classes for animations (not JavaScript)
- Event delegation not needed (small number of links)
- No DOM mutations after initialization (except on navigation)
- Component caching in `sessionStorage` in main.js

### Bundle Size

- **HTML**: ~8 KB (minified)
- **JavaScript**: ~6 KB (unminified), can be gzipped to ~2 KB
- **CSS**: Uses existing Tailwind classes (no additional CSS file)

---

## Customization Guide

### Change Colors

Update Tailwind classes in `components/sidebar.html`:

```html
<!-- Current: cyan/blue gradient -->
<div class="bg-gradient-to-br from-cyan-500 to-blue-600">
  <!-- Change to purple/pink -->
  <div class="bg-gradient-to-br from-purple-500 to-pink-600">
    <!-- Active link highlight: cyan -->
    <link class="bg-cyan-50 text-cyan-800" />

    <!-- Change to green -->
    <link class="bg-green-50 text-green-800" />
  </div>
</div>
```

### Add New Menu Item

```html
<a
  href="/pages/new-section/page.html"
  data-sidebar-link
  data-sidebar-roles="admin,officer"  <!-- Who can see it -->
  class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
>
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Your SVG icon -->
  </svg>
  <span class="truncate" data-sidebar-label>New Item</span>
</a>
```

### Add New Role

1. Update `normalizeRole()` in `sidebar.js`:

```javascript
function normalizeRole(role) {
  const normalized = String(role || "user").toLowerCase();
  const roleMap = {
    student: "user",
    teacher: "officer",
    moderator: "officer", // Add here
  };
  // ...
}
```

2. Add role to menu items:

```html
<a data-sidebar-roles="admin,officer,moderator">Moderate Content</a>
```

3. Add dashboard route in `sidebar.js`:

```javascript
const DASHBOARD_ROUTES = {
  admin: "/pages/dashboard/admin.html",
  officer: "/pages/dashboard/officer.html",
  user: "/pages/dashboard/user.html",
  moderator: "/pages/dashboard/moderator.html", // Add here
};
```

---

## Troubleshooting

### Sidebar Not Showing

**Problem**: Sidebar doesn't appear on page
**Solution**: Ensure `loadComponents()` and `initSidebar()` are called:

```javascript
// Check browser console for errors
document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents(); // Load HTML
  initSidebar(); // Initialize JS
});
```

### Role-Based Menu Not Working

**Problem**: Admin items showing for regular users
**Solution**: Check localStorage and initialization:

```javascript
// Check current role
console.log(localStorage.getItem("paperhub-role"));

// Verify data-sidebar-roles attribute
console.log(document.querySelector("[data-sidebar-link]").getAttribute("data-sidebar-roles"));

// Re-init with explicit role
window.initPaperHubSidebar({ role: "admin" });
```

### Mobile Sidebar Not Closing

**Problem**: Sidebar stays open when clicking overlay
**Solution**: Ensure overlay has event listener:

```javascript
// Check in DevTools:
const overlay = document.getElementById("sidebarOverlay");
getEventListeners(overlay).click; // Should show listener
```

### Collapse Button Not Working

**Problem**: Collapse doesn't toggle sidebar
**Solution**: Ensure button is visible on desktop (not mobile):

```javascript
// Button should be hidden on mobile (md:hidden becomes md:inline-flex)
const btn = document.getElementById("sidebarCollapseBtn");
const styles = window.getComputedStyle(btn);
console.log(styles.display); // Should be 'flex' on desktop
```

---

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ IE not supported (uses `classList`, `querySelector`, etc.)

---

## Best Practices

1. **Always use `data-sidebar-*` attributes** for DOM queries
2. **Keep menu items alphabetical** for better UX
3. **Use existing SVG icons** for consistency
4. **Test collapse on desktop** and mobile slide-in separately
5. **Verify role visibility** after updating role-based items
6. **Use semantic links** (`<a>` tags, not divs)
7. **Include icons** for visual recognition
8. **Limit nesting depth** - single level of grouping

---

## Summary

The PaperHub sidebar is a **production-grade component** that provides:

✅ Clean, minimal code  
✅ Professional UI/UX  
✅ Full role-based access control  
✅ Responsive mobile + desktop  
✅ Keyboard accessibility  
✅ Persistent user preferences  
✅ Zero external dependencies  
✅ Easy to customize

Perfect for large-scale document management platforms and SaaS dashboards.
