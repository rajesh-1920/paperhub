# PaperHub Sidebar - Implementation Guide

## Quick Start (5 minutes)

### 1. Load Components

Your page needs the sidebar HTML and scripts:

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Page</title>
    <script src="/assets/js/tailwind-setup.js"></script>
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
    <link rel="stylesheet" href="/assets/css/global.css" />
  </head>
  <body>
    <!-- Navbar Container -->
    <div id="navbar-container"></div>

    <!-- Sidebar Container -->
    <div id="sidebar-container"></div>

    <!-- Main Content -->
    <main class="md:ml-72">
      <!-- Your content here -->
    </main>

    <!-- Scripts (already configured in main.js) -->
    <script src="/assets/js/main.js"></script>
  </body>
</html>
```

### 2. Initialize

**The `main.js` already handles this automatically:**

```javascript
// Automatically runs on page load:
// 1. Loads /components/sidebar.html into #sidebar-container
// 2. Loads /components/navbar.html into #navbar-container
// 3. Calls window.initPaperHubSidebar() to activate JavaScript
```

### 3. Set User Role

```javascript
// Store role in localStorage (persists across sessions)
localStorage.setItem("paperhub-role", "admin");

// Or pass directly during init
window.initPaperHubSidebar({ role: "officer" });

// Sidebar will automatically show/hide items based on role
```

Done! Sidebar is now working.

---

## Real-World Examples

### Example 1: Admin Dashboard

```html
<!-- File: pages/dashboard/admin.html -->
<!doctype html>
<html>
  <head>
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
  </head>
  <body>
    <!-- Sidebar auto-loads here -->
    <div id="sidebar-container"></div>

    <!-- Main content -->
    <main class="md:ml-72 p-6">
      <h1 class="text-3xl font-bold">Admin Dashboard</h1>
      <!-- Content -->
    </main>

    <!-- Auto-init sidebar for admin role -->
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        localStorage.setItem("paperhub-role", "admin");
        window.initPaperHubSidebar({ role: "admin" });
      });
    </script>
    <script src="/assets/js/main.js"></script>
  </body>
</html>
```

**Result:**

- ✅ Dashboard, Files, Reviews visible
- ✅ Users, Reports, Settings visible (admin section)
- ✅ Upload, Payments hidden (user-only)

---

### Example 2: Officer Review Panel

```html
<!-- File: pages/review/review-queue.html -->
<!doctype html>
<html>
  <head>
    <title>Review Queue - Officer</title>
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
  </head>
  <body>
    <div id="sidebar-container"></div>
    <div id="navbar-container"></div>

    <main class="md:ml-72 p-6">
      <h1 class="text-3xl font-bold">Review Queue</h1>
      <p class="text-slate-600">Documents awaiting review</p>

      <div class="mt-6 space-y-4">
        <!-- Document list -->
      </div>
    </main>

    <!-- Set officer role -->
    <script>
      localStorage.setItem("paperhub-role", "officer");
    </script>
    <script src="/assets/js/main.js"></script>
  </body>
</html>
```

**Result:**

- ✅ Dashboard, Files, Reviews visible
- ✅ Upload, Payments hidden
- ✅ Admin section hidden

---

### Example 3: User Upload Page

```html
<!-- File: pages/file/upload.html -->
<!doctype html>
<html>
  <head>
    <title>Upload Document - User</title>
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
  </head>
  <body>
    <div id="sidebar-container"></div>

    <main class="md:ml-72 p-6">
      <h1 class="text-3xl font-bold">Upload Document</h1>

      <div class="max-w-2xl mt-6">
        <form id="uploadForm" class="space-y-4">
          <input type="file" required />
          <button type="submit" class="btn btn-primary">Upload</button>
        </form>
      </div>
    </main>

    <!-- User role (default) -->
    <script>
      localStorage.setItem("paperhub-role", "user");
    </script>
    <script src="/assets/js/main.js"></script>
  </body>
</html>
```

**Result:**

- ✅ Dashboard, Files, Upload, Payments visible
- ✅ Reviews hidden (officer-only)
- ✅ Admin section hidden

---

## Responsive Layout

### Adding Left Margin to Content

When sidebar is **not collapsed**, add left margin to main content:

```html
<!-- Option 1: Fixed margin (always visible) -->
<main class="md:ml-72">
  <!-- Content shifts 288px on desktop, 0px on mobile -->
</main>

<!-- Option 2: Flexible margin (responsive to collapse) -->
<main class="md:ml-72 lg:ml-[288px] transition-all duration-300">
  <!-- Content smoothly transitions when sidebar collapses -->
</main>
```

### Full-Width Sections

Some sections may need full width (e.g., hero, footer):

```html
<!-- Sidebar -->
<div id="sidebar-container"></div>

<!-- Content area -->
<main class="md:ml-72">
  <section class="bg-white py-12">
    <h1>Welcome</h1>
  </section>
</main>

<!-- Full-width footer -->
<footer class="border-t border-slate-200">
  <div class="md:ml-72 px-6 py-8">
    <p>&copy; 2026 PaperHub</p>
  </div>
</footer>
```

---

## Working with Roles

### Getting Current Role

```javascript
// Read from localStorage
const currentRole = localStorage.getItem("paperhub-role") || "user";
console.log(currentRole); // "admin", "officer", or "user"
```

### Changing Role

```javascript
// Switch to officer role
localStorage.setItem("paperhub-role", "officer");

// Re-initialize sidebar
window.initPaperHubSidebar({ role: "officer" });

// Sidebar automatically updates visible items
```

### Role-Based Content Display

```html
<!-- Hide for non-admins -->
<div id="adminPanel" style="display: none;">
  <h2>Admin Panel</h2>
  <!-- Admin content -->
</div>

<script>
  const role = localStorage.getItem("paperhub-role");
  if (role === "admin") {
    document.getElementById("adminPanel").style.display = "block";
  }
</script>
```

---

## Mobile Testing

### Testing on Desktop

1. Open DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Select mobile device (iPhone, etc.)
4. Toggle hamburger button (☰) to open sidebar
5. Click overlay or menu item to close

### Testing on Desktop

1. Open page normally
2. Sidebar should be visible by default
3. Click collapse button (arrow) in top-right
4. Sidebar should collapse to icon-only view
5. Hover over icons to see tooltips

---

## Active Link Highlighting

The sidebar automatically highlights the current page:

```
Current URL: /pages/dashboard/admin.html
Highlighted: Dashboard link (cyan background)

Current URL: /pages/review/review-queue.html
Highlighted: Reviews link (cyan background)
```

### How It Works

```javascript
// In sidebar.js:
function applyActiveLink() {
  const currentPath = normalizePath(window.location.pathname);

  document.querySelectorAll("[data-sidebar-link]").forEach((link) => {
    const href = normalizePath(link.getAttribute("href"));
    const isMatch = currentPath === href || currentPath.startsWith(href + "/");

    if (isMatch) {
      link.classList.add("bg-cyan-50", "text-cyan-800", "ring-1", "ring-cyan-200");
      link.setAttribute("aria-current", "page");
    }
  });
}
```

---

## Customization Examples

### Add New Menu Item

**File: components/sidebar.html**

```html
<div class="mt-2 space-y-1.5">
  <!-- Existing items -->
  <a href="/pages/dashboard/user.html" data-sidebar-link data-sidebar-roles="admin,officer,user">
    Dashboard
  </a>

  <!-- NEW: Analytics link (only for admins and officers) -->
  <a
    href="/pages/analytics/dashboard.html"
    data-sidebar-link
    data-sidebar-roles="admin,officer"
    class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
  >
    <svg
      class="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <line x1="12" y1="2" x2="12" y2="22"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
    <span class="truncate" data-sidebar-label>Analytics</span>
  </a>
</div>
```

### Change Color Scheme

**File: components/sidebar.html**

```html
<!-- BEFORE: Cyan/Blue gradient -->
<div class="bg-gradient-to-br from-cyan-500 to-blue-600">
  <!-- AFTER: Purple/Pink gradient -->
  <div class="bg-gradient-to-br from-purple-500 to-pink-600"></div>
</div>
```

**Active link highlight:**

```html
<!-- BEFORE: Cyan highlight -->
class="... hover:bg-slate-100 ..."

<!-- AFTER: Green highlight -->
<a class="... bg-green-50 text-green-800 ring-1 ring-green-200 ..."></a>
```

---

## Advanced Usage

### Programmatic Role Switching

```javascript
// Admin page switches user role programmatically
function switchUserRole(role) {
  localStorage.setItem("paperhub-role", role);

  // Re-initialize sidebar with new role
  window.initPaperHubSidebar({ role });

  console.log(`Switched to ${role} role`);
}

// Usage:
switchUserRole("officer");
switchUserRole("user");
```

### Custom Role Validation

```javascript
// Extend role normalization in sidebar.js
function validateRole(role) {
  const allowedRoles = ["admin", "officer", "user", "moderator"];

  if (allowedRoles.includes(role)) {
    return role;
  }

  console.warn(`Invalid role "${role}", defaulting to "user"`);
  return "user";
}
```

### Dynamic Menu Items

```javascript
// Show/hide menu items based on conditions
function updateMenuVisibility() {
  const userRole = localStorage.getItem("paperhub-role");
  const isPremium = localStorage.getItem("paperhub-premium") === "true";

  // Hide Reports for non-premium officers
  const reportsLink = document.querySelector('a[href*="reports"]');
  if (userRole === "officer" && !isPremium) {
    reportsLink.classList.add("hidden");
  }
}

// Call after init
window.initPaperHubSidebar();
updateMenuVisibility();
```

---

## Performance Tips

### 1. Use Data Attributes for Queries

✅ Good (fast):

```javascript
document.querySelectorAll("[data-sidebar-link]");
```

❌ Avoid (slower):

```javascript
document.querySelectorAll("a.sidebar-link, a.nav-item, a.menu-link");
```

### 2. Cache DOM Elements

✅ Good:

```javascript
const sidebar = document.getElementById("paperhubSidebar");
const overlay = document.getElementById("sidebarOverlay");
// Use cached references
```

❌ Avoid:

```javascript
// Don't query the same element multiple times
document.getElementById("paperhubSidebar").classList.add("hidden");
document.getElementById("paperhubSidebar").classList.remove("bg-white");
```

### 3. Use CSS Classes for Animations

✅ Good (GPU-accelerated):

```css
.sidebar {
  transition: transform 0.3s ease-out;
}
```

❌ Avoid (janky):

```javascript
// Don't animate with JavaScript loops
setInterval(() => {
  sidebar.style.left = currentLeft + "px";
}, 16);
```

---

## Browser DevTools Debugging

### Check Current Role

```javascript
// In console:
localStorage.getItem("paperhub-role");
```

### Check Sidebar Visibility

```javascript
const sidebar = document.getElementById("paperhubSidebar");
console.log(sidebar.classList); // See all classes
console.log(sidebar.getAttribute("data-sidebar-roles")); // Role restriction
```

### Check Active Link

```javascript
document.querySelectorAll("[data-sidebar-link]").forEach((link) => {
  const isActive = link.classList.contains("bg-cyan-50");
  console.log(link.textContent, isActive);
});
```

### Simulate Role Change

```javascript
// Change role and re-init
localStorage.setItem("paperhub-role", "admin");
window.initPaperHubSidebar({ role: "admin" });
```

---

## Summary

The sidebar is **production-ready** and requires minimal setup:

1. ✅ Components load automatically in `main.js`
2. ✅ Roles controlled via `localStorage`
3. ✅ Mobile/desktop responsive out-of-the-box
4. ✅ No additional dependencies
5. ✅ Easy to customize

Start using it now on your pages!
