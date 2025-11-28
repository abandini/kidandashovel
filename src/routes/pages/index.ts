import { Hono } from 'hono';
import type { Env } from '../../types';
import { landingPage } from './home';

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
  // TODO: Render login page
  return c.html('<html><body><h1>Login - Coming Soon</h1></body></html>');
});

/**
 * GET /signup/homeowner
 * Homeowner registration page
 */
pageRoutes.get('/signup/homeowner', async (c) => {
  // TODO: Render homeowner signup page
  return c.html('<html><body><h1>Homeowner Signup - Coming Soon</h1></body></html>');
});

/**
 * GET /signup/teen
 * Teen worker registration page
 */
pageRoutes.get('/signup/teen', async (c) => {
  // TODO: Render teen signup page
  return c.html('<html><body><h1>Teen Worker Signup - Coming Soon</h1></body></html>');
});

/**
 * GET /signup/parent
 * Parent registration page
 */
pageRoutes.get('/signup/parent', async (c) => {
  // TODO: Render parent signup page
  return c.html('<html><body><h1>Parent Signup - Coming Soon</h1></body></html>');
});

/**
 * GET /about
 * About page
 */
pageRoutes.get('/about', async (c) => {
  // TODO: Render about page
  return c.html('<html><body><h1>About - Coming Soon</h1></body></html>');
});

/**
 * GET /faq
 * FAQ page
 */
pageRoutes.get('/faq', async (c) => {
  // TODO: Render FAQ page
  return c.html('<html><body><h1>FAQ - Coming Soon</h1></body></html>');
});

/**
 * GET /dashboard
 * User dashboard (redirects based on user type)
 */
pageRoutes.get('/dashboard', async (c) => {
  // TODO: Check auth and redirect to appropriate dashboard
  return c.redirect('/login');
});

/**
 * GET /workers
 * Browse workers page (for homeowners)
 */
pageRoutes.get('/workers', async (c) => {
  // TODO: Render browse workers page
  return c.html('<html><body><h1>Browse Workers - Coming Soon</h1></body></html>');
});

/**
 * GET /workers/:id
 * Worker profile page
 */
pageRoutes.get('/workers/:id', async (c) => {
  // TODO: Render worker profile page
  return c.html('<html><body><h1>Worker Profile - Coming Soon</h1></body></html>');
});

/**
 * GET /jobs/new
 * Post new job page (for homeowners)
 */
pageRoutes.get('/jobs/new', async (c) => {
  // TODO: Render new job form
  return c.html('<html><body><h1>Post a Job - Coming Soon</h1></body></html>');
});

/**
 * GET /jobs/:id
 * Job detail page
 */
pageRoutes.get('/jobs/:id', async (c) => {
  // TODO: Render job detail page
  return c.html('<html><body><h1>Job Details - Coming Soon</h1></body></html>');
});

/**
 * GET /worker/dashboard
 * Teen worker dashboard
 */
pageRoutes.get('/worker/dashboard', async (c) => {
  // TODO: Render worker dashboard
  return c.html('<html><body><h1>Worker Dashboard - Coming Soon</h1></body></html>');
});

/**
 * GET /worker/jobs
 * Browse available jobs (for teens)
 */
pageRoutes.get('/worker/jobs', async (c) => {
  // TODO: Render browse jobs page
  return c.html('<html><body><h1>Browse Jobs - Coming Soon</h1></body></html>');
});

/**
 * GET /worker/profile
 * Edit worker profile
 */
pageRoutes.get('/worker/profile', async (c) => {
  // TODO: Render profile edit page
  return c.html('<html><body><h1>Edit Profile - Coming Soon</h1></body></html>');
});

/**
 * GET /worker/earnings
 * Earnings dashboard
 */
pageRoutes.get('/worker/earnings', async (c) => {
  // TODO: Render earnings dashboard
  return c.html('<html><body><h1>Earnings - Coming Soon</h1></body></html>');
});

/**
 * GET /parent/dashboard
 * Parent dashboard
 */
pageRoutes.get('/parent/dashboard', async (c) => {
  // TODO: Render parent dashboard
  return c.html('<html><body><h1>Parent Dashboard - Coming Soon</h1></body></html>');
});

/**
 * GET /parent/consent/:token
 * Parent consent page
 */
pageRoutes.get('/parent/consent/:token', async (c) => {
  // TODO: Render consent page
  return c.html('<html><body><h1>Parent Consent - Coming Soon</h1></body></html>');
});
