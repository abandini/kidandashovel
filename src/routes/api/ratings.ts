// Ratings API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { validateRating } from '../../utils/validation';
import { createRating, getRatingsForJob, hasRatedJob, getUserRatingStats } from '../../db/queries/ratings';
import { getJobById, markJobReviewed } from '../../db/queries/jobs';
import { createEarning } from '../../db/queries/earnings';
import { calculateFees } from '../../utils/helpers';
import { authMiddleware, requireAuth, getCurrentUser } from '../../middleware/auth';

const ratings = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
ratings.use('*', authMiddleware());

// Submit rating for a job
ratings.post('/', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const body = await c.req.json();

    const {
      job_id,
      rating,
      review_text,
      quality_rating,
      punctuality_rating,
      communication_rating,
      payment_rating,
      accuracy_rating,
      treatment_rating,
      would_hire_again,
      would_work_again,
    } = body;

    if (!job_id) {
      return c.json({ success: false, error: 'Job ID is required' }, 400);
    }

    // Validate rating
    const validation = validateRating({ rating, review_text });
    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    // Get job
    const job = await getJobById(c.env.DB, job_id);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    // Verify user is part of this job
    const isHomeowner = job.homeowner_id === user!.id;
    const isWorker = job.worker_id === user!.id;

    if (!isHomeowner && !isWorker) {
      return c.json({ success: false, error: 'You are not part of this job' }, 403);
    }

    // Job must be completed to rate
    if (!['completed', 'reviewed'].includes(job.status)) {
      return c.json({ success: false, error: 'Job must be completed before rating' }, 400);
    }

    // Check if already rated
    const alreadyRated = await hasRatedJob(c.env.DB, job_id, user!.id);
    if (alreadyRated) {
      return c.json({ success: false, error: 'You have already rated this job' }, 400);
    }

    // Determine who is being rated
    const ratedId = isHomeowner ? job.worker_id! : job.homeowner_id;
    const raterType = isHomeowner ? 'homeowner' : 'teen';

    // Create rating
    const newRating = await createRating(c.env.DB, {
      job_id,
      rater_id: user!.id,
      rated_id: ratedId,
      rater_type: raterType,
      rating,
      review_text,
      quality_rating: isHomeowner ? quality_rating : undefined,
      punctuality_rating: isHomeowner ? punctuality_rating : undefined,
      communication_rating,
      payment_rating: !isHomeowner ? payment_rating : undefined,
      accuracy_rating: !isHomeowner ? accuracy_rating : undefined,
      treatment_rating: !isHomeowner ? treatment_rating : undefined,
      would_hire_again: isHomeowner ? would_hire_again : undefined,
      would_work_again: !isHomeowner ? would_work_again : undefined,
      is_public: true,
    });

    // Check if both parties have rated, then process payment/earnings
    const jobRatings = await getRatingsForJob(c.env.DB, job_id);

    if (jobRatings.length === 2) {
      // Mark job as reviewed
      await markJobReviewed(c.env.DB, job_id);

      // If this was a Stripe payment and homeowner just rated, process payment
      if (job.payment_method === 'stripe' && isHomeowner && job.payment_status === 'pending') {
        // TODO: Process Stripe payment
        // For now, just create the earnings record for cash payments
      }

      // Create earnings record for the worker (for cash payments or after Stripe processes)
      if (job.payment_method === 'cash' || job.payment_status === 'paid') {
        const amount = job.price_final || job.price_accepted || job.price_offered || 0;
        const fees = calculateFees(amount);

        await createEarning(c.env.DB, {
          user_id: job.worker_id!,
          job_id: job.id,
          gross_amount: amount,
          platform_fee: fees.platform_fee,
          future_fund_contribution: fees.future_fund,
          net_amount: fees.net_amount,
          payment_method: job.payment_method || 'cash',
        });
      }

      // Update homeowner's completed job count
      await c.env.DB.prepare(`
        UPDATE homeowner_profiles
        SET jobs_completed_count = jobs_completed_count + 1, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(job.homeowner_id).run();
    }

    return c.json({ success: true, data: newRating }, 201);
  } catch (error) {
    console.error('Create rating error:', error);
    return c.json({ success: false, error: 'Failed to create rating' }, 500);
  }
});

// Get ratings for a job
ratings.get('/job/:jobId', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { jobId } = c.req.param();

    const job = await getJobById(c.env.DB, jobId);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    // Only participants can see job ratings
    if (job.homeowner_id !== user!.id && job.worker_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const jobRatings = await getRatingsForJob(c.env.DB, jobId);

    return c.json({
      success: true,
      data: jobRatings,
    });
  } catch (error) {
    console.error('Get job ratings error:', error);
    return c.json({ success: false, error: 'Failed to get ratings' }, 500);
  }
});

// Get my rating stats
ratings.get('/me/stats', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const stats = await getUserRatingStats(c.env.DB, user!.id);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    return c.json({ success: false, error: 'Failed to get rating stats' }, 500);
  }
});

// Check if user has rated a job
ratings.get('/check/:jobId', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { jobId } = c.req.param();

    const hasRated = await hasRatedJob(c.env.DB, jobId, user!.id);

    return c.json({
      success: true,
      data: { has_rated: hasRated },
    });
  } catch (error) {
    console.error('Check rating error:', error);
    return c.json({ success: false, error: 'Failed to check rating' }, 500);
  }
});

export default ratings;
