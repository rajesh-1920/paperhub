// ============================================================================
// PaperHub Main App Initialization
// ============================================================================

// App initialization
function initApp() {
  initializeTheme();
  loadUserData();
  setupEventListeners();
  loadComponents();
}

// Load user data from storage
function loadUserData() {
  const user = getCurrentUser();
  if (!user) return;

  // Update navbar/sidebar with user info
  const userNameElements = document.querySelectorAll('[data-user-name]');
  const userRoleElements = document.querySelectorAll('[data-user-role]');
  const userEmailElements = document.querySelectorAll('[data-user-email]');

  userNameElements.forEach(el => (el.textContent = user.name));
  userRoleElements.forEach(el => (el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1)));
  userEmailElements.forEach(el => (el.textContent = user.email));
}

// Setup global event listeners
function setupEventListeners() {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
  }

  // Handle keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
  }
}

function handleKeyboardShortcuts(e) {
  // Close on Escape
  if (e.key === 'Escape') {
    document.getElementById('mobileMenu')?.classList.add('hidden');
  }

  // Cmd/Ctrl + K for search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    // TODO: Open search/command palette
  }
}

// Load and inject components
async function loadComponents() {
  try {
    // Check if we should load authenticated components
    if (isLoggedIn()) {
      await loadComponent('navbar', '/components/navbar.html');
      await loadComponent('sidebar', '/components/sidebar.html');
    }
    await loadComponent('footer', '/components/footer.html');
  } catch (error) {
    console.error('Error loading components:', error);
  }
}

async function loadComponent(id, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${id}`);
    const html = await response.text();

    // Try to inject into existing element or create new one
    let container = document.getElementById(id);
    if (!container) {
      container = createElement('div', '', id);
      if (id === 'navbar') {
        document.body.insertBefore(container, document.body.firstChild);
      } else if (id === 'footer') {
        document.body.appendChild(container);
      } else if (id === 'sidebar') {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }
    container.innerHTML = html;

    // Re-initialize theme after injection
    initializeTheme();
  } catch (error) {
    console.error(`Error loading component ${id}:`, error);
  }
}

// Check authentication and redirect if needed
function requireAuth() {
  if (!isLoggedIn()) {
    redirect('/pages/auth/login.html');
    return false;
  }
  return true;
}

// Check role-based access
function requireRole(allowedRoles) {
  if (!isLoggedIn()) {
    redirect('/pages/auth/login.html');
    return false;
  }

  const userRole = getCurrentUserRole();
  if (!allowedRoles.includes(userRole)) {
    redirect('/pages/errors/404.html');
    return false;
  }

  return true;
}

// Mock API data for development
const MockData = {
  users: {
    user1: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      avatar: '👤',
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
    },
    officer1: {
      id: 'officer1',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'officer',
      avatar: '👨‍💼',
      lastLogin: new Date(Date.now() - 1800000).toISOString(),
    },
    admin1: {
      id: 'admin1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      avatar: '👑',
      lastLogin: new Date(Date.now() - 600000).toISOString(),
    },
  },

  documents: [
    {
      id: 'doc1',
      name: 'Project Proposal.pdf',
      size: 2048576,
      type: 'pdf',
      uploadedAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'approved',
      owner: 'John Doe',
    },
    {
      id: 'doc2',
      name: 'Budget Report 2024.xlsx',
      size: 1024576,
      type: 'xlsx',
      uploadedAt: new Date(Date.now() - 172800000).toISOString(),
      status: 'pending',
      owner: 'John Doe',
    },
    {
      id: 'doc3',
      name: 'Meeting Notes.docx',
      size: 512576,
      type: 'docx',
      uploadedAt: new Date(Date.now() - 259200000).toISOString(),
      status: 'approved',
      owner: 'John Doe',
    },
  ],

  reviews: [
    {
      id: 'rev1',
      documentId: 'doc1',
      documentName: 'Project Proposal.pdf',
      reviewer: 'Jane Smith',
      status: 'approved',
      comments: 'Looks good, approved for submission.',
      reviewedAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'rev2',
      documentId: 'doc2',
      documentName: 'Budget Report 2024.xlsx',
      reviewer: 'Jane Smith',
      status: 'pending',
      comments: null,
      reviewedAt: null,
    },
  ],
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
