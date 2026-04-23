# PaperHub Frontend

**Production-Ready UI for Secure Digital Document Management Platform**

## 🎯 Overview

PaperHub Frontend is a modern, responsive, production-ready web interface for a document management system. Built with vanilla HTML5, CSS3, and JavaScript (no frameworks), it features a complete SaaS-style dashboard with file management, review workflows, and payment handling.

**No build steps required** – works immediately in any browser with a simple HTTP server.

## ✨ Key Features

- ✅ **Role-Based Dashboards** – User, Officer, and Admin dashboard variants
- ✅ **File Management** – Drag & drop upload, file listing, version history
- ✅ **Review Workflows** – Queue management, document review, approval/rejection
- ✅ **Payment Management** – Protected payment interface (available post-approval)
- ✅ **Reusable Components** – Navbar, Sidebar, Footer dynamically loaded
- ✅ **Responsive Design** – Desktop, tablet, and mobile optimized
- ✅ **Mock Data & APIs** – Ready for immediate testing and backend integration
- ✅ **Professional UI** – Modern SaaS design with animations and polish

## 📁 Project Structure

```
paperhub/
├── index.html                    # Landing page
├── assets/
│   ├── css/
│   │   └── global.css           # Complete design system (600+ lines)
│   ├── js/
│   │   ├── utils.js             # Shared utilities (700+ lines)
│   │   ├── main.js              # App initialization
│   │   ├── file.js              # File management
│   │   └── review.js            # Review workflows
│   └── images/                  # Image assets
├── components/
│   ├── navbar.html              # Top navigation bar
│   ├── sidebar.html             # Side navigation
│   └── footer.html              # Footer component
└── pages/
    ├── dashboard/
    │   ├── user.html
    │   ├── admin.html
    │   └── officer.html
    ├── file/
    │   ├── upload.html
    │   ├── file-details.html
    │   └── version-history.html
    ├── review/
    │   ├── review-queue.html
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
