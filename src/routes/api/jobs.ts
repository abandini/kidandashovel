// Jobs API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env, ServiceType } from '../../types';
import { validateJobPosting } from '../../utils/validation';
import { calculateDistance, getBoundingBox } from '../../utils/geo';
import {
  createJob,
  getJobById,
  updateJob,
  claimJob,
  confirmJob,
  startJob,
  completeJob,
  cancelJob,
  getJobsByHomeowner,
  getJobsByWorker,
  getAvailableJobs,
  countJobsByStatus,
} from '../../db/queries/jobs';
import { getUserById, getTeenProfileByUserId, getHomeownerProfileByUserId } from '../../db/queries/users';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';

const jobs = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
jobs.use('*', authMiddleware());

// Get available jobs (for workers)
jobs.get('/', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const {
      lat,
      lng,
      radius,
      service_type,
      min_price,
      max_price,
      limit,
      offset,
    } = c.req.query();

    // If user is a worker, use their location and radius preferences
    let searchLat = parseFloat(lat) || user?.lat;
    let searchLng = parseFloat(lng) || user?.lng;
    let searchRadius = parseFloat(radius) || 5;

    if (user?.type === 'teen') {
      const profile = await getTeenProfileByUserId(c.env.DB, user.id);
      if (profile) {
        searchRadius = profile.travel_radius_miles;
      }
    }

    // Get bounding box for efficient query
    let boundingBox;
    if (searchLat && searchLng) {
      boundingBox = getBoundingBox(searchLat, searchLng, searchRadius);
    }

    const jobsList = await getAvailableJobs(c.env.DB, {
      minLat: boundingBox?.minLat,
      maxLat: boundingBox?.maxLat,
      minLng: boundingBox?.minLng,
      maxLng: boundingBox?.maxLng,
      serviceType: service_type,
      minPrice: min_price ? parseFloat(min_price) : undefined,
      maxPrice: max_price ? parseFloat(max_price) : undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });

    // Add distance to each job and filter by exact radius
    const jobsWithDistance = jobsList
      .map(job => ({
        ...job,
        distance_miles: searchLat && searchLng && job.lat && job.lng
          ? calculateDistance(searchLat, searchLng, job.lat, job.lng)
          : null,
      }))
      .filter(job =>
        !searchLat || !searchLng || job.distance_miles === null || job.distance_miles <= searchRadius
      )
      .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));

    return c.json({
      success: true,
      data: jobsWithDistance,
      total: jobsWithDistance.length,
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return c.json({ success: false, error: 'Failed to get jobs' }, 500);
  }
});

// Get my jobs (homeowner or worker)
jobs.get('/my', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { status, limit, offset } = c.req.query();

    let jobsList;
    if (user?.type === 'homeowner') {
      jobsList = await getJobsByHomeowner(
        c.env.DB,
        user.id,
        status ? status.split(',') as any : undefined,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );
    } else if (user?.type === 'teen') {
      jobsList = await getJobsByWorker(
        c.env.DB,
        user.id,
        status ? status.split(',') as any : undefined,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );
    } else {
      return c.json({ success: false, error: 'Invalid user type' }, 400);
    }

    // Get job counts by status
    const counts = await countJobsByStatus(
      c.env.DB,
      user!.id,
      user?.type === 'homeowner' ? 'homeowner' : 'worker'
    );

    return c.json({
      success: true,
      data: jobsList,
      counts,
    });
  } catch (error) {
    console.error('Get my jobs error:', error);
    return c.json({ success: false, error: 'Failed to get jobs' }, 500);
  }
});

// Get job by ID
jobs.get('/:id', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    const job = await getJobById(c.env.DB, id);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    // Get homeowner info
    const homeowner = await getUserById(c.env.DB, job.homeowner_id);
    const homeownerProfile = await getHomeownerProfileByUserId(c.env.DB, job.homeowner_id);

    // Get worker info if assigned
    let worker = null;
    let workerProfile = null;
    if (job.worker_id) {
      worker = await getUserById(c.env.DB, job.worker_id);
      workerProfile = await getTeenProfileByUserId(c.env.DB, job.worker_id);
    }

    // Calculate distance from user
    let distance = null;
    if (user?.lat && user?.lng && job.lat && job.lng) {
      distance = calculateDistance(user.lat, user.lng, job.lat, job.lng);
    }

    return c.json({
      success: true,
      data: {
        job,
        homeowner: homeowner ? {
          id: homeowner.id,
          name: homeowner.name,
          avg_rating: homeownerProfile?.avg_rating || 0,
          jobs_completed: homeownerProfile?.jobs_completed_count || 0,
        } : null,
        worker: worker ? {
          id: worker.id,
          name: worker.name,
          profile_photo_url: workerProfile?.profile_photo_url,
          avg_rating: workerProfile?.avg_rating || 0,
          completed_jobs: workerProfile?.completed_jobs_count || 0,
        } : null,
        distance_miles: distance,
      },
    });
  } catch (error) {
    console.error('Get job error:', error);
    return c.json({ success: false, error: 'Failed to get job' }, 500);
  }
});

// Create new job (homeowner only)
jobs.post('/', requireAuth(), requireUserType('homeowner'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const body = await c.req.json();

    const {
      service_type,
      address,
      city,
      zip,
      lat,
      lng,
      description,
      special_instructions,
      price_offered,
      scheduled_for,
      is_asap,
    } = body;

    // Validate job posting
    const validation = validateJobPosting({
      service_type,
      address,
      description,
      price_offered,
      scheduled_for,
    });

    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    const job = await createJob(c.env.DB, {
      homeowner_id: user!.id,
      service_type: service_type as ServiceType,
      address: address || user!.address || '',
      city: city || user!.city,
      zip: zip || user!.zip,
      lat: lat || user!.lat,
      lng: lng || user!.lng,
      description,
      special_instructions,
      price_offered,
      scheduled_for: scheduled_for || null,
      is_asap: is_asap !== false,
      additional_photos: [],
    });

    // Update homeowner's job count
    await c.env.DB.prepare(`
      UPDATE homeowner_profiles
      SET jobs_posted_count = jobs_posted_count + 1, updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(user!.id).run();

    return c.json({ success: true, data: job }, 201);
  } catch (error) {
    console.error('Create job error:', error);
    return c.json({ success: false, error: 'Failed to create job' }, 500);
  }
});

// Claim job (worker only)
jobs.post('/:id/claim', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    // Check if worker is verified
    const profile = await getTeenProfileByUserId(c.env.DB, user!.id);
    if (!profile?.verified) {
      return c.json({ success: false, error: 'Parent consent required to claim jobs' }, 403);
    }

    const success = await claimJob(c.env.DB, id, user!.id);

    if (!success) {
      return c.json({ success: false, error: 'Job is no longer available' }, 400);
    }

    const job = await getJobById(c.env.DB, id);

    // TODO: Send notification to homeowner

    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Claim job error:', error);
    return c.json({ success: false, error: 'Failed to claim job' }, 500);
  }
});

// Confirm job (homeowner or worker)
jobs.post('/:id/confirm', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const { price_accepted } = await c.req.json().catch(() => ({}));

    const success = await confirmJob(c.env.DB, id, user!.id, price_accepted);

    if (!success) {
      return c.json({ success: false, error: 'Cannot confirm this job' }, 400);
    }

    const job = await getJobById(c.env.DB, id);

    // TODO: Send notification to other party

    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Confirm job error:', error);
    return c.json({ success: false, error: 'Failed to confirm job' }, 500);
  }
});

// Start job (worker only)
jobs.post('/:id/start', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const { before_photo_url } = await c.req.json().catch(() => ({}));

    const success = await startJob(c.env.DB, id, user!.id, before_photo_url);

    if (!success) {
      return c.json({ success: false, error: 'Cannot start this job' }, 400);
    }

    const job = await getJobById(c.env.DB, id);

    // TODO: Send notification to homeowner

    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Start job error:', error);
    return c.json({ success: false, error: 'Failed to start job' }, 500);
  }
});

// Complete job (worker only)
jobs.post('/:id/complete', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const { after_photo_url, notes } = await c.req.json().catch(() => ({}));

    const success = await completeJob(c.env.DB, id, user!.id, after_photo_url, notes);

    if (!success) {
      return c.json({ success: false, error: 'Cannot complete this job' }, 400);
    }

    const job = await getJobById(c.env.DB, id);

    // TODO: Send notification to homeowner

    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Complete job error:', error);
    return c.json({ success: false, error: 'Failed to complete job' }, 500);
  }
});

// Cancel job
jobs.post('/:id/cancel', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const { reason } = await c.req.json().catch(() => ({}));

    const success = await cancelJob(c.env.DB, id, user!.id, reason);

    if (!success) {
      return c.json({ success: false, error: 'Cannot cancel this job' }, 400);
    }

    const job = await getJobById(c.env.DB, id);

    // TODO: Send notification to other party

    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Cancel job error:', error);
    return c.json({ success: false, error: 'Failed to cancel job' }, 500);
  }
});

// Update job (homeowner only, limited fields)
jobs.patch('/:id', requireAuth(), requireUserType('homeowner'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const body = await c.req.json();

    const job = await getJobById(c.env.DB, id);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    if (job.homeowner_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Only allow updates on posted jobs
    if (job.status !== 'posted') {
      return c.json({ success: false, error: 'Cannot modify job after it has been claimed' }, 400);
    }

    const allowedFields = ['description', 'special_instructions', 'price_offered', 'scheduled_for'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateJob(c.env.DB, id, updates);
    }

    const updatedJob = await getJobById(c.env.DB, id);

    return c.json({ success: true, data: updatedJob });
  } catch (error) {
    console.error('Update job error:', error);
    return c.json({ success: false, error: 'Failed to update job' }, 500);
  }
});

export default jobs;
