// HTML layout template for A Kid and a Shovel

import type { User } from '../types';

export interface LayoutOptions {
  title?: string;
  description?: string;
  user?: User | null;
  scripts?: string[];
  styles?: string[];
}

export function layout(content: string, options: LayoutOptions = {}): string {
  const {
    title = 'A Kid and a Shovel',
    description = 'Connect with local teens for snow removal in Northeast Ohio',
    user = null,
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#2563eb">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --secondary: #64748b;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-light: #64748b;
      --border: #e2e8f0;
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --radius: 8px;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

    /* Header */
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    header .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
    }
    .logo span { color: var(--text); }
    nav { display: flex; gap: 1rem; align-items: center; }
    nav a {
      color: var(--text);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      transition: background 0.2s;
    }
    nav a:hover { background: var(--bg); }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      border-radius: var(--radius);
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-dark); }
    .btn-secondary { background: var(--bg); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--border); }
    .btn-success { background: var(--success); color: white; }
    .btn-danger { background: var(--danger); color: white; }
    .btn-lg { padding: 1rem 2rem; font-size: 1.125rem; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }

    /* Cards */
    .card {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-title { font-size: 1.125rem; font-weight: 600; }

    /* Forms */
    .form-group { margin-bottom: 1rem; }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    input, select, textarea {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
    }
    .form-error { color: var(--danger); font-size: 0.875rem; margin-top: 0.25rem; }

    /* Rating */
    .rating { display: flex; gap: 0.25rem; }
    .star { color: #fbbf24; font-size: 1.25rem; }
    .star.empty { color: var(--border); }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-primary { background: #dbeafe; color: #1e40af; }

    /* Grid */
    .grid { display: grid; gap: 1rem; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }

    /* Utilities */
    .text-center { text-align: center; }
    .text-light { color: var(--text-light); }
    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1rem; }
    .mt-4 { margin-top: 2rem; }
    .mb-2 { margin-bottom: 1rem; }
    .mb-4 { margin-bottom: 2rem; }
    .flex { display: flex; }
    .flex-between { justify-content: space-between; }
    .flex-center { align-items: center; }
    .gap-1 { gap: 0.5rem; }
    .gap-2 { gap: 1rem; }

    /* Main content */
    main { padding: 2rem 0; min-height: calc(100vh - 160px); }

    /* Footer */
    footer {
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      padding: 2rem 0;
      text-align: center;
      color: var(--text-light);
    }
    footer a { color: var(--primary); text-decoration: none; }

    /* Responsive */
    @media (max-width: 768px) {
      nav { display: none; }
      .mobile-nav { display: block; }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <a href="/" class="logo">A Kid <span>and a</span> Shovel</a>
      <nav>
        ${user ? getUserNav(user) : getGuestNav()}
      </nav>
    </div>
  </header>

  <main>
    <div class="container">
      ${content}
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} A Kid and a Shovel. Connecting Northeast Ohio communities.</p>
      <p class="mt-1">
        <a href="/about">About</a> &middot;
        <a href="/faq">FAQ</a> &middot;
        <a href="/privacy">Privacy</a> &middot;
        <a href="/terms">Terms</a>
      </p>
    </div>
  </footer>

  <script>
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  </script>
</body>
</html>`;
}

function getGuestNav(): string {
  return `
    <a href="/about">About</a>
    <a href="/login" class="btn btn-secondary btn-sm">Log In</a>
    <a href="/signup/homeowner" class="btn btn-primary btn-sm">Get Started</a>
  `;
}

function getUserNav(user: User): string {
  const dashboardUrl = user.type === 'teen' ? '/worker/dashboard' : '/dashboard';
  return `
    <a href="${dashboardUrl}">Dashboard</a>
    ${user.type === 'homeowner' ? '<a href="/workers">Find Workers</a>' : ''}
    ${user.type === 'teen' ? '<a href="/worker/jobs">Find Jobs</a>' : ''}
    <a href="/settings">Settings</a>
    <span class="text-light">|</span>
    <span>${user.name}</span>
    <a href="#" onclick="logout()">Log Out</a>
  `;
}

export function renderStars(rating: number, maxStars: number = 5): string {
  let html = '<div class="rating">';
  for (let i = 1; i <= maxStars; i++) {
    html += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
  }
  html += '</div>';
  return html;
}

export function renderBadge(status: string): string {
  const statusMap: Record<string, { class: string; label: string }> = {
    posted: { class: 'badge-primary', label: 'Posted' },
    claimed: { class: 'badge-warning', label: 'Claimed' },
    confirmed: { class: 'badge-primary', label: 'Confirmed' },
    in_progress: { class: 'badge-warning', label: 'In Progress' },
    completed: { class: 'badge-success', label: 'Completed' },
    reviewed: { class: 'badge-success', label: 'Reviewed' },
    cancelled: { class: 'badge-danger', label: 'Cancelled' },
    disputed: { class: 'badge-danger', label: 'Disputed' },
    verified: { class: 'badge-success', label: 'Verified' },
    pending: { class: 'badge-warning', label: 'Pending' },
  };

  const { class: badgeClass, label } = statusMap[status] || { class: 'badge-secondary', label: status };
  return `<span class="badge ${badgeClass}">${label}</span>`;
}
