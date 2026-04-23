# PaperHub Sidebar - Visual & Architecture Guide

## 🎨 Desktop View (Full Width)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Top Navbar                               │
└─────────────────────────────────────────────────────────────────┘
┌──────────┬───────────────────────────────────────────────────────┐
│          │                                                       │
│ SIDEBAR  │                    MAIN CONTENT                       │
│ (w-72)   │                                                       │
│          │  Dashboard                                            │
│  [logo]  │  ─────────────────────────────────────────────────   │
│  PH      │  [Content Area]                                       │
│  ────────┤                                                       │
│          │                                                       │
│ Workspace│                                                       │
│ ├─ 🏠 Dashboard (active)                                         │
│ ├─ 📄 Files                                                      │
│ ├─ ⬆️ Upload                                                     │
│ ├─ ✓ Reviews                                                     │
│ └─ 💳 Payments                                                   │
│          │                                                       │
│ Admin    │                                                       │
│ ├─ 👥 Users                                                      │
│ ├─ 📊 Reports                                                    │
│ └─ ⚙️ Settings                                                   │
│          │                                                       │
│ ─────────┤                                                       │
│ 🚪 Logout│                                                       │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

**Sidebar Dimensions:**

- Width: 288px (w-72)
- Height: 100vh (full screen)
- Fixed position
- Z-index: 40

---

## 🎨 Desktop View (Collapsed)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Top Navbar                               │
└─────────────────────────────────────────────────────────────────┘
┌──┬───────────────────────────────────────────────────────────────┐
│  │                                                               │
│  │                    MAIN CONTENT                               │
│  │  Dashboard                                                    │
│  │  ─────────────────────────────────────────────────────────   │
│  │  [Content Area]                                               │
│ ─┼─                                                              │
│ [  [Content continues]                                           │
│  │                                                               │
│ ─┼─                                                              │
│ [🚪                                                              │
│  │                                                               │
└──┴───────────────────────────────────────────────────────────────┘

Legend:
  [  = Icon (centered)
  🚪 = Logout icon
```

**Collapsed Sidebar Dimensions:**

- Width: 80px (w-20)
- Height: 100vh (full screen)
- Icons centered
- Labels hidden

---

## 📱 Mobile View (Default - Closed)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰  PaperHub Navigation                              ⚙️  Theme   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    MAIN CONTENT                                 │
│                                                                 │
│                   Dashboard                                     │
│                 ─────────────────────                           │
│                 [Content Area]                                  │
│                                                                 │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
  ☰  = Mobile toggle button (visible on mobile)
  ⚙️  = Theme toggle button
```

**Mobile Toggle Button:**

- Position: Fixed, top-left
- Size: 40px (h-10 w-10)
- Z-index: 30

---

## 📱 Mobile View (Open - Overlay)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰  PaperHub Navigation                              ⚙️  Theme   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ ╭──────────────────╮                                            │
│ │      ✕            │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ [PH] PaperHub   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │      Secure...  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ ────────────────│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │                 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ Workspace       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ 🏠 Dashboard    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ 📄 Files       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ ⬆️ Upload       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ ✓ Reviews      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ 💳 Payments    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │                 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ │ ────────────────│                                            │
│ │ 🚪 Logout      │                                            │
│ │                 │                                            │
│ ╰──────────────────╯                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
  ╭─────╮ = Sidebar (slid in from left)
  ░░░░░░ = Overlay backdrop (clickable to close)
  ✕     = Close button
```

**Mobile Overlay State:**

- Sidebar: Slide-in from left
- Width: 288px (same as desktop)
- Overlay: Backdrop with 45% opacity
- Z-index: Sidebar=40, Overlay=30
- Animation: 300ms ease-out

---

## 🏗️ HTML Structure Tree

```
<aside id="paperhubSidebar">
  │
  ├─ Header (border-b)
  │  ├─ Logo Container
  │  │  ├─ Logo Box (gradient)
  │  │  └─ Brand Info
  │  │     ├─ Title
  │  │     └─ Subtitle
  │  │
  │  └─ Control Buttons
  │     ├─ Collapse Btn (desktop only)
  │     └─ Close Btn (mobile only)
  │
  ├─ Navigation
  │  ├─ Workspace Section
  │  │  ├─ Section Title
  │  │  └─ Links
  │  │     ├─ Dashboard (all)
  │  │     ├─ Files (officer, user)
  │  │     ├─ Upload (user)
  │  │     ├─ Reviews (admin, officer)
  │  │     └─ Payments (user)
  │  │
  │  └─ Administration Section (admin only)
  │     ├─ Section Title
  │     └─ Links
  │        ├─ Users (admin)
  │        ├─ Reports (admin)
  │        └─ Settings (admin)
  │
  └─ Footer (border-t)
     └─ Logout Link
```

---

## 🎯 Role-Based Visibility Logic

```
User Role (from localStorage)
  │
  ├─ ADMIN
  │  │
  │  ├─ Show: Dashboard, Files*, Reviews*, Users, Reports, Settings, Logout
  │  └─ Hide: Upload, Payments
  │  (* Available but officer/user can also access)
  │
  ├─ OFFICER
  │  │
  │  ├─ Show: Dashboard, Files, Reviews, Logout
  │  ├─ Hide: Upload, Payments, Users, Reports, Settings
  │  └─ Hide Section: Administration
  │
  └─ USER
     │
     ├─ Show: Dashboard, Files, Upload, Payments, Logout
     ├─ Hide: Reviews, Users, Reports, Settings
     └─ Hide Section: Administration
```

**How It Works:**

```javascript
// Each menu item has:
<a data-sidebar-roles="admin,officer,user">

// JavaScript checks:
if (userRole matches any role in data-sidebar-roles) {
  element.classList.remove("hidden")  // Show
} else {
  element.classList.add("hidden")     // Hide
}
```

---

## 🔄 State Machine

```
                    ┌─────────────────────┐
                    │   INITIALIZATION    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Load Component HTML │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Get User Role       │
                    │ (localStorage)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Apply Role Filters  │
                    │ (show/hide items)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Highlight Active    │
                    │ Page Link           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Attach Event        │
                    │ Listeners           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────────────────┐
                    │   READY FOR INTERACTION         │
                    │   (User can click menu items)    │
                    └─────────────────────────────────┘
```

---

## 🖱️ Event Flow Diagram

```
User Interaction
  │
  ├─ Clicks Mobile Toggle (☰)
  │  └─ openMobileSidebar()
  │     ├─ Remove: -translate-x-full
  │     ├─ Add: translate-x-0
  │     └─ Show overlay
  │
  ├─ Clicks Overlay (50% opacity area)
  │  └─ closeMobileSidebar()
  │     ├─ Add: -translate-x-full
  │     ├─ Remove: translate-x-0
  │     └─ Hide overlay
  │
  ├─ Clicks Menu Link
  │  ├─ Navigates to page
  │  ├─ Page loads
  │  └─ Sidebar re-initializes
  │     └─ Highlights new active link
  │
  ├─ Clicks Collapse Button (desktop)
  │  └─ setCollapsed()
  │     ├─ Toggle: md:w-72 ↔ md:w-20
  │     ├─ Toggle: Labels hidden/visible
  │     ├─ Toggle: Icons centered/normal
  │     ├─ Rotate collapse button 180°
  │     └─ Save preference to localStorage
  │
  ├─ Presses Escape Key
  │  └─ closeMobileSidebar() (mobile only)
  │
  └─ Window Resize
     └─ syncSidebarForViewport()
        ├─ If width >= 768px (desktop)
        │  └─ Show sidebar, hide overlay
        └─ If width < 768px (mobile)
           └─ Hide sidebar, hide overlay
```

---

## 💾 LocalStorage Schema

```
Key: "paperhub-role"
Value: "admin" | "officer" | "user"
Persists: Across sessions
Used By: applyRoleVisibility()
Example: localStorage.setItem("paperhub-role", "admin")

Key: "paperhub-sidebar-collapsed"
Value: "true" | "false"
Persists: Across sessions (desktop only)
Used By: getPersistedCollapseState()
Example: localStorage.setItem("paperhub-sidebar-collapsed", "true")

Key: "paperhub-component-cache"
Value: JSON object with HTML cache
Persists: During session only (sessionStorage)
Used By: main.js (component loader)
```

---

## 📊 CSS Class Application Flow

### On Initialization

```
HTML Element
  │
  ├─ If role doesn't match data-sidebar-roles
  │  └─ Add class: hidden
  │
  └─ If role matches
     └─ Do nothing (visible by default)
```

### On Active Link Detection

```
Page loads (e.g., /pages/dashboard/admin.html)
  │
  ├─ Get current path: normalizePath()
  │  └─ Remove "index.html", trailing slashes
  │
  ├─ Compare with each link's href
  │  └─ Links with matching path
  │
  └─ Add classes to matching link:
     ├─ bg-cyan-50       (background)
     ├─ text-cyan-800    (text color)
     ├─ ring-1           (border)
     ├─ ring-cyan-200    (border color)
     └─ aria-current="page"
```

### On Collapse Toggle

```
User clicks collapse button
  │
  ├─ Sidebar element:
  │  ├─ Remove: md:w-72  → Add: md:w-20
  │  │
  │  └─ All [data-sidebar-link] elements:
  │     ├─ Add: md:justify-center (icons centered)
  │
  ├─ All label elements:
  │  ├─ [data-sidebar-label]
  │  ├─ [data-sidebar-section-title]
  │  ├─ [data-sidebar-brand]
  │  └─ Add class: md:hidden
  │
  ├─ Collapse button:
  │  ├─ Add class: rotate-180
  │  ├─ Update aria-expanded: true → false
  │  └─ Update aria-label
  │
  └─ Save state: localStorage.setItem("paperhub-sidebar-collapsed", "true")
```

---

## 🎬 Animation Timings

```
Mobile Sidebar Open/Close:
├─ Duration: 300ms
├─ Easing: ease-out
├─ Transform: translate-x-full ↔ translate-x-0
└─ Smooth, not jarring

Overlay Fade:
├─ Duration: Same as sidebar (300ms)
├─ Opacity: 0 ↔ 1
└─ Blur: 0 ↔ 4px

Collapse Animation:
├─ Duration: 300ms (CSS transition)
├─ Properties: width, visibility
└─ User can still interact during animation

Button Hover:
├─ Duration: Instant
├─ Border: slate-200 → cyan-300
├─ Background: white → cyan-50
├─ Text: slate-600 → cyan-700
└─ Smooth color transition
```

---

## 🔍 Z-Index Stack (Bottom to Top)

```
Z-Index Layer     Element
─────────────────────────────
0 (default)       Body, main content
10                Links, buttons
30                Mobile overlay backdrop
40                Sidebar (on top of content)
50                Navbar (above sidebar)
9999              Toast notifications
```

**Priority:**

- Content: Base layer
- Overlay: Above content, below sidebar
- Sidebar: Above overlay
- Navbar: Above everything

---

## 📐 Responsive Breakpoints

```
Mobile (< 768px)
├─ Sidebar: Off-screen (-translate-x-full)
├─ Toggle button: Visible
├─ Collapse button: Hidden
└─ Content margin: 0

Desktop (≥ 768px, md: in Tailwind)
├─ Sidebar: Visible (translate-x-0)
├─ Toggle button: Hidden
├─ Collapse button: Visible
└─ Content margin: ml-72 or ml-20 (if collapsed)
```

---

## 🎓 Component Lifecycle

```
1. PAGE LOAD
   └─ DOMContentLoaded event fires
      └─ loadComponents() fetches sidebar.html

2. HTML INJECTION
   └─ sidebar.html inserted into #sidebar-container
      └─ Elements ready in DOM

3. SCRIPT LOADING
   └─ sidebar.js loaded (IIFE executes)
      └─ window.initPaperHubSidebar function registered

4. INITIALIZATION
   └─ main.js calls initPaperHubSidebar()
      ├─ Get current user role
      ├─ Apply role-based visibility
      ├─ Apply active link highlighting
      └─ Attach event listeners

5. READY
   └─ Sidebar is interactive
      ├─ Buttons respond to clicks
      ├─ Links navigate
      ├─ Mobile toggle works
      └─ Keyboard shortcuts work

6. TEARDOWN
   └─ User navigates away
      └─ Role and collapse state saved to localStorage
         └─ Preferences persist on next visit
```

---

## 🧠 Memory Optimization

```
What's Cached?
├─ Component HTML (sessionStorage)
├─ User role (localStorage)
└─ Collapse preference (localStorage)

What's NOT Cached?
├─ DOM references (queried each init)
├─ Event listeners (re-attached each page load)
└─ Computed styles (recalculated each init)

Why?
├─ Sidebar HTML rarely changes
├─ User role persists across sessions
├─ Preferences survive reloads
└─ Fresh event listeners prevent memory leaks
```

---

## Summary

The **PaperHub Sidebar** uses:

✅ **Clean Architecture** - Separated HTML, CSS, JS  
✅ **Modular Code** - IIFE pattern, reusable functions  
✅ **Efficient DOM** - Minimal queries, CSS-based animations  
✅ **Smart State** - localStorage for persistence  
✅ **Role System** - Data attributes for filtering  
✅ **Responsive Design** - Mobile-first, Tailwind breakpoints  
✅ **Accessibility** - ARIA labels, keyboard support

Perfect for production-grade applications!
