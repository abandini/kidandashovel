import { Hono } from 'hono';
import type { Env, UserType } from '../../types';
import { landingPage } from './home';
import { homeownerSignupPage, teenSignupPage, loginPage, consentPage, dashboardPage } from './auth';

export const pageRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /
 * Landing page
 */
pageRoutes.get('/', async (c) => {
  return c.html(landingPage(c.env));
});

/**
 * GET /login
 * Login page
 */
pageRoutes.get('/login', async (c) => {
  return c.html(loginPage(c.env));
});

/**
 * GET /signup/homeowner
 * Homeowner registration page
 */
pageRoutes.get('/signup/homeowner', async (c) => {
  return c.html(homeownerSignupPage(c.env));
});

/**
 * GET /signup/teen
 * Teen worker registration page
 */
pageRoutes.get('/signup/teen', async (c) => {
  return c.html(teenSignupPage(c.env));
});

/**
 * GET /signup/parent
 * Parent registration page (redirect to homeowner for now)
 */
pageRoutes.get('/signup/parent', async (c) => {
  // Parents can use the homeowner flow
  return c.redirect('/signup/homeowner');
});

/**
 * GET /consent/:token
 * Parent consent page
 */
pageRoutes.get('/consent/:token', async (c) => {
  const token = c.req.param('token');
  return c.html(consentPage(c.env, token));
});

/**
 * GET /dashboard
 * User dashboard (requires authentication)
 */
pageRoutes.get('/dashboard', async (c) => {
  // Get session from cookie
  const cookieHeader = c.req.header('Cookie');
  let sessionId: string | undefined;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'session') {
        sessionId = value;
        break;
      }
    }
  }

  if (!sessionId) {
    return c.redirect('/login');
  }

  const session = (await c.env.SESSIONS.get(sessionId, 'json')) as {
    userId: string;
    userType: UserType;
    email: string;
    name: string;
    expiresAt: number;
  } | null;

  if (!session || Date.now() > session.expiresAt) {
    return c.redirect('/login');
  }

  return c.html(dashboardPage(c.env, session.name, session.userType));
});

/**
 * GET /about
 * About page
 */
pageRoutes.get('/about', async (c) => {
  // TODO: Render about page
  return c.html('<html><body><h1>About - Coming Soon</h1><a href="/">Back home</a></body></html>');
});

/**
 * GET /faq
 * FAQ page
 */
pageRoutes.get('/faq', async (c) => {
  // TODO: Render FAQ page
  return c.html('<html><body><h1>FAQ - Coming Soon</h1><a href="/">Back home</a></body></html>');
});

/**
 * GET /workers
 * Browse workers page (for homeowners)
 */
pageRoutes.get('/workers', async (c) => {
  // TODO: Render browse workers page
  return c.html('<html><body><h1>Browse Workers - Coming Soon</h1><a href="/">Back home</a></body></html>');
});

/**
 * GET /workers/:id
 * Worker profile page
 */
pageRoutes.get('/workers/:id', async (c) => {
  // TODO: Render worker profile page
  return c.html('<html><body><h1>Worker Profile - Coming Soon</h1><a href="/">Back home</a></body></html>');
});

/**
 * GET /jobs/post
 * Post new job page (for homeowners)
 */
pageRoutes.get('/jobs/post', async (c) => {
  // TODO: Render new job form
  return c.html('<html><body><h1>Post a Job - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /jobs/new (alias)
 */
pageRoutes.get('/jobs/new', async (c) => {
  return c.redirect('/jobs/post');
});

/**
 * GET /jobs
 * Jobs list page
 */
pageRoutes.get('/jobs', async (c) => {
  // TODO: Render jobs list
  return c.html('<html><body><h1>Jobs - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /jobs/available
 * Available jobs for workers
 */
pageRoutes.get('/jobs/available', async (c) => {
  // TODO: Render available jobs for workers
  return c.html('<html><body><h1>Available Jobs - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /jobs/my
 * User's claimed/posted jobs
 */
pageRoutes.get('/jobs/my', async (c) => {
  // TODO: Render user's jobs
  return c.html('<html><body><h1>My Jobs - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /jobs/:id
 * Job detail page
 */
pageRoutes.get('/jobs/:id', async (c) => {
  // TODO: Render job detail page
  return c.html('<html><body><h1>Job Details - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /profile
 * Edit user profile
 */
pageRoutes.get('/profile', async (c) => {
  // TODO: Render profile edit page
  return c.html('<html><body><h1>Edit Profile - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /earnings
 * Earnings dashboard (for workers)
 */
pageRoutes.get('/earnings', async (c) => {
  // TODO: Render earnings dashboard
  return c.html('<html><body><h1>Earnings - Coming Soon</h1><a href="/dashboard">Back to dashboard</a></body></html>');
});

/**
 * GET /forgot-password
 * Forgot password page
 */
pageRoutes.get('/forgot-password', async (c) => {
  // TODO: Render forgot password page
  return c.html('<html><body><h1>Forgot Password - Coming Soon</h1><a href="/login">Back to login</a></body></html>');
});

// Legacy routes - redirect
pageRoutes.get('/worker/dashboard', (c) => c.redirect('/dashboard'));
pageRoutes.get('/worker/jobs', (c) => c.redirect('/jobs/available'));
pageRoutes.get('/worker/profile', (c) => c.redirect('/profile'));
pageRoutes.get('/worker/earnings', (c) => c.redirect('/earnings'));
pageRoutes.get('/parent/dashboard', (c) => c.redirect('/dashboard'));
pageRoutes.get('/parent/consent/:token', (c) => c.redirect(`/consent/${c.req.param('token')}`));
