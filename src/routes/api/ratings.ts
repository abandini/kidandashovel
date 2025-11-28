import { Hono } from 'hono';
import type { Env } from '../../types';

export const ratingsRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/ratings/:userId
 * Get ratings for a user
 */
ratingsRoutes.get('/:userId', async (c) => {
  // TODO: Implement get user ratings
  // Returns list of ratings, average, breakdown by category
  return c.json({ success: false, error: 'Not implemented' }, 501);
});
