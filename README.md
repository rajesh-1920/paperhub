# PaperHub - Modern SaaS Document Management Frontend

<div align="center">

**Production-Ready Frontend for Secure Document Management Platform**

[![Built with HTML5](https://img.shields.io/badge/HTML5-E34C26?style=flat-square&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

</div>

## 🎯 Overview

PaperHub is a modern, responsive, production-ready SaaS frontend for document management. Built with **vanilla HTML5, CSS3 (Tailwind), and JavaScript** — no frameworks, no build steps required for development. Perfect for teams managing documents with role-based access control, review workflows, and payment processing.

### ✨ Key Features

- ✅ **Modern SaaS Design** — Professional UI with Tailwind CSS
- ✅ **Responsive Layout** — Works perfectly on desktop, tablet, and mobile
- ✅ **Dark Mode Support** — Built-in theme switching
- ✅ **Role-Based Access** — User, Officer, and Admin dashboards
- ✅ **File Management** — Upload, organize, and version tracking
- ✅ **Review Workflows** — Approval queues and workflow management
- ✅ **Payment Ready** — Payment interface integration support
- ✅ **Reusable Components** — Navbar, Sidebar, Footer, and more
- ✅ **Mock Data** — Ready for immediate testing
- ✅ **API Ready** — Easy integration with backend APIs
- ✅ **Performance Optimized** — Fast, lightweight, and efficient
- ✅ **Accessibility** — WCAG compliant markup

## 📁 Project Structure

```
paperhub/
├── index.html                      # Landing page (public)
├── src/
│   ├── pages/                      # Page templates
│   │   ├── auth/                   # Authentication pages
│   │   │   ├── login.html
│   │   │   └── register.html
│   │   ├── dashboard/              # Role-based dashboards
│   │   │   ├── user.html
│   │   │   ├── officer.html
│   │   │   └── admin.html
│   │   ├── file/                   # Document management
│   │   │   ├── upload.html
│   │   │   ├── file-details.html
│   │   │   └── version-history.html
│   │   ├── review/                 # Review workflows
│   │   │   ├── review-queue.html
│   │   │   └── review-details.html
│   │   ├── payment/                # Payment pages
│   │   │   └── payment.html
│   │   ├── account/                # User account pages
│   │   │   ├── profile.html
│   │   │   └── settings.html
│   │   ├── support/                # Support pages
│   │   │   └── contact.html
│   │   └── errors/                 # Error pages
│   │       └── 404.html
│   ├── components/                 # Reusable components
│   │   ├── navbar.html             # Navigation bar
│   │   ├── sidebar.html            # Side navigation
│   │   └── footer.html             # Footer
│   └── css/
│       └── input.css               # Tailwind input CSS
├── public/
│   └── assets/
│       ├── css/
│       │   └── tailwind.css        # Compiled Tailwind CSS
│       ├── js/
│       │   ├── utils.js            # Utility functions
│       │   ├── app.js              # App initialization
│       │   ├── auth.js             # Authentication logic
│       │   ├── file.js             # File management
│       │   ├── review.js           # Review workflows
│       │   ├── navbar.js           # Navbar functionality
│       │   ├── sidebar.js          # Sidebar functionality
│       │   └── pages/              # Page-specific scripts
│       └── images/                 # Image assets
├── package.json                    # Dependencies & scripts
├── tailwind.config.js              # Tailwind configuration
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ (for Tailwind CSS processing)
- npm or pnpm
- A modern web browser

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd paperhub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development:**
   ```bash
   npm start
   # or
   npm run watch:css & npm run serve
   ```

4. **Open in browser:**
   ```
   http://localhost:8000
   ```

### Available Scripts

```bash
# Development - Compile CSS and start dev server
npm start

# Watch CSS changes
npm run watch:css

# Build CSS for production (minified)
npm run build:css

# Serve the public directory
npm run serve

# Development server with auto-reload
npm run dev
```

## 🎨 Design System

### Color Palette

- **Primary**: Sky Blue (`#0ea5e9`)
- **Secondary**: Purple (`#8b5cf6`)
- **Success**: Green (`#10b981`)
- **Warning**: Amber (`#f59e0b`)
- **Error**: Red (`#ef4444`)

### Typography

- **Display Font**: Sora (headings)
- **Body Font**: Inter (content)

### Components

All reusable component classes are available in `src/css/input.css`:

```html
<!-- Buttons -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Cards -->
<div class="card">Content</div>
<div class="card-interactive">Interactive Card</div>

<!-- Badges -->
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>

<!-- Forms -->
<input type="text" class="input" placeholder="Enter text">

<!-- Utilities -->
<h1 class="gradient-text">Gradient Text</h1>
<div class="container-wide">Full-width container</div>
<div class="container-tight">Tight container</div>
```

## 🔧 Usage Examples

### Authentication

```javascript
// Set user after login
setCurrentUser({
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
});

// Check if logged in
if (isLoggedIn()) {
  console.log('User is logged in');
}

// Get current user
const user = getCurrentUser();
console.log(user.name);

// Logout
logout(); // Redirects to login page
```

### Theme Management

```javascript
// Get current theme
const isDark = getTheme();

// Set theme
setTheme(true);  // Dark
setTheme(false); // Light

// Toggle theme
toggleTheme();
```

### Notifications

```javascript
// Show toast messages
showSuccess('Operation successful!');
showError('An error occurred!');
showWarning('Warning message');
showInfo('Info message');

// With custom duration
showSuccess('Message', 5000);
```

### Storage

```javascript
// Set data
setStorage('user-preferences', { theme: 'dark', language: 'en' });

// Get data
const prefs = getStorage('user-preferences');

// Remove data
removeStorage('user-preferences');

// Clear all
clearStorage();
```

### API Calls

```javascript
// GET request
const result = await apiGet('/api/documents');
if (result.success) {
  console.log(result.data);
}

// POST request
const result = await apiPost('/api/documents', {
  name: 'My Document',
  type: 'pdf'
});

// PUT request
const result = await apiPut('/api/documents/1', {
  name: 'Updated Name'
});

// DELETE request
const result = await apiDelete('/api/documents/1');
```

### Role-Based Access

```javascript
// Check if user has specific role
if (hasRole('admin')) {
  console.log('User is admin');
}

// Check multiple roles
if (hasRole(['admin', 'officer'])) {
  console.log('User is admin or officer');
}

// Require role on page load
if (!requireRole(['admin', 'officer'])) {
  // User doesn't have required role, redirected
}
```

### Utilities

```javascript
// Date formatting
formatDate(new Date()); // "Apr 25, 2024"
formatTime(new Date()); // "14:30"
timeAgo(new Date(Date.now() - 3600000)); // "1h ago"

// File size
formatFileSize(1048576); // "1 MB"

// Currency
formatCurrency(99.99, 'USD'); // "$99.99"

// Validation
isValidEmail('user@example.com'); // true
isValidPassword('SecurePass123'); // true
isValidUrl('https://example.com'); // true

// Utilities
slugify('Hello World'); // "hello-world"
copyToClipboard('Text to copy');
generateId('doc'); // "doc-1234567890-abc123def"
```

## 📱 Responsive Breakpoints

- **Mobile**: 0px - 639px
- **Tablet**: 640px - 1023px
- **Desktop**: 1024px+

## 🔐 Security Considerations

1. **localStorage** stores user session — clear on logout
2. **Sensitive data** should use secure HTTP-only cookies
3. **API calls** should include authentication headers
4. **Input validation** on client and server side
5. **XSS Protection** - Use `textContent` instead of `innerHTML` when possible

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📦 Dependencies

### Production
- None! Pure vanilla HTML5/CSS3/JavaScript

### Development
- **tailwindcss** ^3.4.17 - CSS utility framework
- **http-server** ^14.1.1 - Development server

## 🔄 Integrating with Backend

### 1. API Endpoints

Update the API base URL in your scripts:

```javascript
const API_BASE = 'https://api.paperhub.com';

async function login(email, password) {
  const result = await apiPost(`${API_BASE}/auth/login`, {
    email, password
  });
  
  if (result.success) {
    setCurrentUser(result.data.user);
    redirect('/src/pages/dashboard/user.html');
  }
}
```

### 2. Authentication

Replace mock authentication with real API calls in `public/assets/js/auth.js`

### 3. Dynamic Content

Replace mock data with API calls throughout the application

## 🎓 Best Practices

1. **Keep components modular** - Each component should have a single responsibility
2. **Use utility functions** - Leverage the utilities in `utils.js`
3. **Follow naming conventions** - Use descriptive class and ID names
4. **Responsive first** - Mobile-first CSS approach
5. **Accessibility** - Use semantic HTML and ARIA attributes
6. **Performance** - Minimize DOM manipulation, use event delegation
7. **Security** - Validate inputs, sanitize outputs, use HTTPS

## 🚀 Deployment

### Static Hosting (Netlify, Vercel, GitHub Pages)

1. Build CSS:
   ```bash
   npm run build:css
   ```

2. Deploy the `public/` directory

3. Set environment variables for API endpoints

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build:css
EXPOSE 8000
CMD ["npm", "run", "serve"]
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@paperhub.com or open an issue on GitHub.

## 🎉 Credits

Built with ❤️ by the PaperHub team.

---

**Made with Vanilla HTML5, Tailwind CSS, and JavaScript** 🚀
    │   └── review-details.html
    └── payment/
        └── payment.html
```

## 🚀 Getting Started

### Method 1: Python HTTP Server (Recommended)

```bash
cd /path/to/paperhub
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Method 2: Node.js HTTP Server

```bash
cd /path/to/paperhub
npx http-server
# Open http://localhost:8080 in your browser
```

### Method 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Browser opens automatically

### Method 4: Direct File Opening

Simply open `index.html` in your browser (file:// protocol)

- ⚠️ _Note: Page navigation may have CORS limitations with file:// protocol_

## 📖 User Guide

### Landing Page (`index.html`)

- Hero section with direct workspace call-to-action buttons
- Features showcase with 6 key benefits
- Workflow visualization (4-step process)
- Direct links into the dashboard and upload flow

### Public Access

The demo build has no login or registration screens. All pages are directly accessible so the project can be presented without extra setup.

### Dashboard Pages

**User Dashboard** (`pages/dashboard/user.html`)

- 4 stat cards: Documents, Pending Reviews, Processed, Payments
- Recent Files table with search and status filter
- Recent Activity feed
- Upload button in header

**Admin Dashboard** (`pages/dashboard/admin.html`)

- 4 admin stat cards: Users, Active Sessions, Processed Docs, Uptime
- User Management table with Edit/Suspend actions
- System Health monitoring cards
- Team overview section

**Officer Dashboard** (`pages/dashboard/officer.html`)

- 4 officer stat cards: Pending Reviews, Reviewed This Month, Avg Time, Rejections
- Review Queue with priority/status badges
- Monthly Performance metrics (Approval Rate, Review Speed, On-Time Rate)

### File Management Pages

**Upload Page** (`pages/file/upload.html`)

- Drag & drop zone for file upload
- Multiple file selection support
- File validation (type: PDF/DOC/DOCX/XLS/XLSX/PNG/JPG; size: 50MB max)
- File preview with progress bars
- Upload simulation with progress tracking

**File Details** (`pages/file/file-details.html`)

- File listing table
- Search and status filtering
- View/Download action buttons
- Mock file data with status badges

**Version History** (`pages/file/version-history.html`)

- Timeline view of file versions
- Version details: author, date, changes, file size
- View/Download/Restore action buttons

### Review Pages

**Review Queue** (`pages/review/review-queue.html`)

- Filter buttons: All, High Priority, Pending, In Review
- Queue table with document info, submitter, priority, status
- Search functionality
- Review action links per document

**Review Details** (`pages/review/review-details.html`)

- Document preview (iframe)
- Document description
- Comments section with existing comments
- Add comment form
- Action buttons: Approve, Reject, Forward

### Payment Page (`pages/payment/payment.html`)

- Payment Status card (shows approval requirement)
- Invoice Summary with itemized breakdown
- Payment Methods section (disabled until approved)
- Payment History table with transaction records

## 🎨 Design System

### CSS Architecture

**File:** `assets/css/global.css` (600+ lines)

**CSS Custom Properties (Variables):**

```css
--primary: #3b82f6 /* Blue */ --secondary: #8b5cf6 /* Purple */ --success: #10b981 /* Green */
  --danger: #ef4444 /* Red */ --warning: #f59e0b /* Orange */ --info: #06b6d4 /* Cyan */
  --dark: #1f2937 /* Dark Gray */ --light: #f3f4f6 /* Light Gray */;
```

**Spacing Scale:**

```css
xs: 0.25rem (4px)     sm: 0.5rem (8px)
md: 1rem (16px)       lg: 1.5rem (24px)
xl: 2rem (32px)       2xl: 3rem (48px)
3xl: 4rem (64px)
```

**Component Classes:**

- `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`, `.btn-success`
- `.card`, `.card-header`, `.card-body`, `.card-footer`
- `.badge`, `.badge-primary`, `.badge-success`, `.badge-danger`
- `.alert`, `.alert-success`, `.alert-error`, `.alert-warning`
- `.table`, `.table-hover`
- `.form-group`, `.form-label`, `.form-input`, `.form-error`

**Responsive Utilities:**

- `.flex`, `.flex-center`, `.flex-between`, `.flex-column`
- `.grid`, `.grid-cols-1` through `.grid-cols-4`
- `.gap-sm`, `.gap-md`, `.gap-lg`
- `.mt-[size]`, `.mb-[size]`, `.p-[size]` (margin/padding utilities)
- `.hidden`, `.inline-block`, `.block`

**Breakpoints:**

- Desktop: ≥1024px
- Tablet: 768px to 1024px
- Mobile: <768px
- Extra small: <480px

## 💻 JavaScript Modules

### `assets/js/utils.js` (700+ lines)

Shared utility library with no dependencies.

**DOM Utilities:**

- `getElement(selector)` – Select single element
- `getElements(selector)` – Select multiple elements
- `createElement(tag, className)` – Create new element
- `addClass(el, class)`, `removeClass(el, class)`, `toggleClass(el, class)`
- `addEvent(el, event, handler)` – Attach event listener with proper context
- `showElement(el)`, `hideElement(el)` – Show/hide with display property

**Storage Utilities:**

- `getStorage(key, default)` – Get localStorage value
- `setStorage(key, value)` – Set localStorage value

**Validation Utilities:**

- `isValidEmail(email)` – RFC 5322 email validation
- `isStrongPassword(password)` – Check password strength (8+ chars, uppercase, lowercase, number, special)
- `validateForm(data, rules)` – Schema-based form validation
- `displayFormErrors(form, errors)` – Show validation errors on form fields

**Notification Utilities:**

- `showToast(message, type, duration)` – Show toast notification (success/error/warning/info)
- `showSuccess(message)` – Success toast shorthand
- `showError(message)` – Error toast shorthand

**Formatting Utilities:**

- `formatDate(date)` – Format date as "Jan 15, 2024"
- `formatFileSize(bytes)` – Convert bytes to KB/MB/GB
- `formatCurrency(amount)` – Format as USD currency
- `formatNumber(number)` – Add thousand separators

**API Utilities:**

- `apiCall(endpoint, method, data)` – Mock API with configurable endpoints
  - Supported endpoints: `/api/dashboard/stats`, `/api/files`, `/api/reviews`
  - Returns Promise with mock data
  - Configurable 300ms delay for realism

**Keyboard Utilities:**

- `initApp()` – Bootstrap application and load shared components
- `onKeyCombo(combo, handler)` – Trigger on key combination (Ctrl+S)
- `initNavbar()` – Setup navbar interactions and role preference handling
  **Scroll Utilities:**

- `updateUserProfile()` – Update navbar user info from the current profile
- `initLoginPage()` – Setup login form submit handler
- `handleLogin(e)` – Process login: validate → API call → session → redirect
- `initRegisterPage()` – Setup register form with password strength watcher
- `handleRegister(e)` – Process registration: validate → API call → session → redirect
- `updatePasswordStrength(e)` – Real-time password strength meter (weak/fair/good/strong)
- `displayFormErrors(form, errors)` – Show field-level validation errors

**Password Strength Requirements:**

- ✓ Minimum 8 characters
- ✓ At least one uppercase letter
- ✓ At least one lowercase letter
- ✓ At least one number
- ✓ At least one special character (@#$%^&\*)

**Mock Auth Data:**
Creates session with: `{ token, user: { id, name, email, role, avatar } }`

### `assets/js/file.js` (350+ lines)

File management: upload, listing, version history.

**Key Functions:**

- `initFileUploadPage()` – Setup drag-drop zone and file input
- `handleFileDrop(e)` – Process dropped files
- `handleFileSelect(e)` – Process manually selected files
- `validateFile(file)` – Check file type and size (50MB max, PDF/DOC/XLS/IMG)
- `addFilePreview(file)` – Add file to preview list with progress bar
- `handleUpload()` – Simulate upload with progress animation (0-100%)
- `initFileDetailsPage()` – Load and display file list
- `loadFileList()` – Fetch mock files, populate table
- `initVersionHistoryPage()` – Load version history
- `loadVersionHistory()` – Display version timeline with restore options

**Supported File Types:**

- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: PNG, JPG, JPEG
- Maximum Size: 50MB per file

**Progress Simulation:**

- Increments 0% → 100% in 10% steps
- Each step takes 100ms (total ~1 second per file)
- Shows success state when complete

### `assets/js/review.js` (300+ lines)

Document review workflow: queue, filtering, details, comments.

**Key Functions:**

- `initReviewQueuePage()` – Load queue and setup filters
- `loadReviewQueue()` – Fetch reviews, populate table
- `setupReviewFilters()` – Setup filter button click handlers
- `filterReviews(priority, status)` – Show/hide review rows based on criteria
- `initReviewDetailsPage()` – Load review details from URL query param
- `loadReviewDetails()` – Populate document preview, description, comments
- `setupReviewActions()` – Wire approve/reject/forward buttons
- `handleReviewAction(action, comment)` – Process approval/rejection decision
- `addComment()` – Add new comment to review discussion

**Review Queue Columns:**

- Document name and type
- Submitted by (officer name)
- Date submitted
- Priority badge (High/Medium/Low)
- Status badge (Pending/In Review/Approved/Rejected)
- Review action button

**Review Actions:**

- **Approve** – Accept document, optional comment
- **Reject** – Decline document, requires comment with reason
- **Forward** – Send to different officer, optional note

## 🔧 Customization Guide

### Changing Colors

Edit `assets/css/global.css` CSS variables:

```css
:root {
  --primary: #3b82f6; /* Change primary blue */
  --secondary: #8b5cf6; /* Change secondary purple */
  --success: #10b981; /* Change success green */
  /* ... other colors ... */
}
```

### Adding a New Page

1. Create HTML file in appropriate `pages/` subdirectory
2. Include component containers:
   ```html
   <div id="navbar-container"></div>
   <div id="sidebar-container"></div>
   <main><!-- Page content --></main>
   <footer id="footer-container"></footer>
   ```
3. Add script to load components: `<script src="../../assets/js/main.js"></script>`
4. Add module script for page logic: `<script src="../../assets/js/yourmodule.js"></script>`
5. Add link to sidebar in `components/sidebar.html`

### Connecting Real Backend

Replace mock `apiCall()` in `utils.js`:

```javascript
async function apiCall(endpoint, method = "GET", data = null) {
  const response = await fetch(`https://your-api.com${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : null,
  });
  return response.json();
}
```

### Shared Startup Logic

Edit `initApp()` in `main.js` to control any shared startup logic:

```javascript
const shouldLoadDashboard = window.location.pathname.includes("dashboard");
```

## 🌐 Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Mobile

**CSS Features Used:** Flexbox, CSS Grid, Custom Properties, Transitions, Media Queries

## 📦 Dependencies

**Zero runtime dependencies** – Pure vanilla JavaScript and CSS

- HTML5 (semantic markup)
- CSS3 (custom properties, flexbox, grid)
- JavaScript ES6+ (fetch, promises, arrow functions)

## 🚀 Deployment

### Static Hosting (Recommended)

- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Firebase Hosting

**Steps:**

1. Push to GitHub
2. Connect repository to hosting service
3. Deploy (automatic on push)

### Docker

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔐 Security Notes

**Current State (Demo):**

- Public demo build with no gated access flow
- No stored session data
- Mock API endpoints (no real backend)

**For Production:**

1. Add proper server-side access control if needed later
2. Validate all inputs server-side
3. Add CSRF protection
4. Implement rate limiting
5. Use HTTPS only
6. Add Content Security Policy headers
7. Sanitize all user inputs

## 📝 Code Examples

### Using Utils for Validation

```javascript
const errors = validateForm(formData, {
  email: { label: "Email", required: true, type: "email" },
  password: { label: "Password", required: true, type: "password", minLength: 8 },
});

if (Object.keys(errors).length > 0) {
  displayFormErrors(form, errors);
  return;
}
```

### Creating a Toast Notification

```javascript
showSuccess("Document uploaded successfully!");
showError("Upload failed. Please try again.");
showWarning("This action cannot be undone.");
showInfo("Processing your request...");
```

### Working with Profile Data

```javascript
const profile = getCurrentUserProfile();
console.log(profile.name);
```

## 🎯 Future Enhancements

- [ ] PWA support (service workers, offline mode)
- [ ] Dark mode theme
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Unit tests (Vitest/Jest)
- [ ] E2E tests (Cypress/Playwright)
- [ ] Build optimization (minification, critical CSS)
- [ ] Internationalization (i18n)
- [ ] Real-time notifications (WebSockets)
- [ ] Advanced data export (PDF, Excel)
- [ ] Document preview enhancement (PDF.js)

## 📄 License

This project is part of **CIT 320 – Software Development Project-II** at Patuakhali Science and Technology University.

**Submitted by:** Rajesh Biswas (ID: 2002060)  
**Semester:** 6 (Level-3, Semester-II)

---

**Last Updated:** April 2026  
**Status:** ✅ Production Ready (Frontend Complete)
