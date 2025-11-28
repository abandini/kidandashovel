import { Hono } from 'hono';
import type { Env } from '../../types';

export const jobsRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/jobs
 * List jobs (homeowners see their jobs, teens see available jobs)
 */
jobsRoutes.get('/', async (c) => {
  // TODO: Implement list jobs
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs
 * Create a new job (homeowners only)
 */
jobsRoutes.post('/', async (c) => {
  // TODO: Implement create job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * GET /api/jobs/:id
 * Get job details
 */
jobsRoutes.get('/:id', async (c) => {
  // TODO: Implement get job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/claim
 * Teen claims a job
 */
jobsRoutes.post('/:id/claim', async (c) => {
  // TODO: Implement claim job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/confirm
 * Confirm job (both parties)
 */
jobsRoutes.post('/:id/confirm', async (c) => {
  // TODO: Implement confirm job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/start
 * Teen starts job (with before photo)
 */
jobsRoutes.post('/:id/start', async (c) => {
  // TODO: Implement start job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/complete
 * Teen completes job (with after photo)
 */
jobsRoutes.post('/:id/complete', async (c) => {
  // TODO: Implement complete job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/review
 * Submit review for completed job
 */
jobsRoutes.post('/:id/review', async (c) => {
  // TODO: Implement submit review
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/cancel
 * Cancel a job
 */
jobsRoutes.post('/:id/cancel', async (c) => {
  // TODO: Implement cancel job
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/pay/cash
 * Mark job as paid in cash
 */
jobsRoutes.post('/:id/pay/cash', async (c) => {
  // TODO: Implement cash payment marking
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * POST /api/jobs/:id/pay/stripe
 * Pay for job via Stripe
 */
jobsRoutes.post('/:id/pay/stripe', async (c) => {
  // TODO: Implement Stripe payment
  return c.json({ success: false, error: 'Not implemented' }, 501);
});
