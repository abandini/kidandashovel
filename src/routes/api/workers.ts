// Workers API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { validateTeenProfile } from '../../utils/validation';
import { calculateDistance, getBoundingBox } from '../../utils/geo';
import { getUserById, getTeenProfileByUserId, updateTeenProfile, getAvailableWorkers } from '../../db/queries/users';
import { getRatingsForUser, getRecentRatingsForDisplay } from '../../db/queries/ratings';
import { getJobsByWorker } from '../../db/queries/jobs';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';

const workers = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
workers.use('*', authMiddleware());

// Get available workers (for homeowners)
workers.get('/', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const {
      lat,
      lng,
      radius,
      service_type,
      min_rating,
      limit,
      offset,
    } = c.req.query();

    // Use user's location if not provided
    const searchLat = parseFloat(lat) || user?.lat;
    const searchLng = parseFloat(lng) || user?.lng;
    const searchRadius = parseFloat(radius) || 5;

    // Get bounding box for efficient query
    let boundingBox;
    if (searchLat && searchLng) {
      boundingBox = getBoundingBox(searchLat, searchLng, searchRadius);
    }

    const workersList = await getAvailableWorkers(c.env.DB, {
      lat: searchLat,
      lng: searchLng,
      minLat: boundingBox?.minLat,
      maxLat: boundingBox?.maxLat,
      minLng: boundingBox?.minLng,
      maxLng: boundingBox?.maxLng,
      serviceType: service_type,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });

    // Add distance and filter by exact radius
    const workersWithDistance = workersList
      .map(w => ({
        ...w,
        distance_miles: searchLat && searchLng && w.user.lat && w.user.lng
          ? calculateDistance(searchLat, searchLng, w.user.lat, w.user.lng)
          : null,
      }))
      .filter(w =>
        !searchLat || !searchLng || w.distance_miles === null || w.distance_miles <= searchRadius
      )
      .filter(w =>
        !min_rating || w.profile.avg_rating >= parseFloat(min_rating)
      )
      .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));

    // Format response
    const formatted = workersWithDistance.map(w => ({
      id: w.user.id,
      name: w.user.name,
      profile_photo_url: w.profile.profile_photo_url,
      bio: w.profile.bio,
      services: w.profile.services,
      equipment: w.profile.equipment,
      travel_radius_miles: w.profile.travel_radius_miles,
      avg_rating: w.profile.avg_rating,
      total_ratings: w.profile.total_ratings,
      completed_jobs: w.profile.completed_jobs_count,
      distance_miles: w.distance_miles,
    }));

    return c.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error('Get workers error:', error);
    return c.json({ success: false, error: 'Failed to get workers' }, 500);
  }
});

// Get worker profile by ID
workers.get('/:id', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    const worker = await getUserById(c.env.DB, id);
    if (!worker || worker.type !== 'teen') {
      return c.json({ success: false, error: 'Worker not found' }, 404);
    }

    const profile = await getTeenProfileByUserId(c.env.DB, id);
    if (!profile) {
      return c.json({ success: false, error: 'Worker profile not found' }, 404);
    }

    // Get recent ratings
    const recentRatings = await getRecentRatingsForDisplay(c.env.DB, id, 5);

    // Calculate distance
    let distance = null;
    if (user?.lat && user?.lng && worker.lat && worker.lng) {
      distance = calculateDistance(user.lat, user.lng, worker.lat, worker.lng);
    }

    // Get completed jobs count by service type
    const completedJobs = await getJobsByWorker(c.env.DB, id, 'reviewed', 100);
    const serviceStats: Record<string, number> = {};
    for (const job of completedJobs) {
      serviceStats[job.service_type] = (serviceStats[job.service_type] || 0) + 1;
    }

    return c.json({
      success: true,
      data: {
        id: worker.id,
        name: worker.name,
        city: worker.city,
        profile_photo_url: profile.profile_photo_url,
        bio: profile.bio,
        age: profile.age,
        school_name: profile.school_name,
        services: profile.services,
        equipment: profile.equipment,
        travel_radius_miles: profile.travel_radius_miles,
        available_now: profile.available_now,
        verified: profile.verified,
        avg_rating: profile.avg_rating,
        total_ratings: profile.total_ratings,
        completed_jobs: profile.completed_jobs_count,
        service_stats: serviceStats,
        recent_ratings: recentRatings.map(r => ({
          rating: r.rating,
          review_text: r.review_text,
          rater_name: r.rater_name,
          created_at: r.created_at,
        })),
        distance_miles: distance,
        member_since: worker.created_at,
      },
    });
  } catch (error) {
    console.error('Get worker error:', error);
    return c.json({ success: false, error: 'Failed to get worker' }, 500);
  }
});

// Get my profile (worker only)
workers.get('/me/profile', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const profile = await getTeenProfileByUserId(c.env.DB, user!.id);

    if (!profile) {
      return c.json({ success: false, error: 'Profile not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          phone: user!.phone,
          address: user!.address,
          city: user!.city,
          zip: user!.zip,
        },
        profile,
      },
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    return c.json({ success: false, error: 'Failed to get profile' }, 500);
  }
});

// Update my profile (worker only)
workers.patch('/me/profile', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const body = await c.req.json();

    const validation = validateTeenProfile({
      bio: body.bio,
      services: body.services,
      equipment: body.equipment,
      travel_radius_miles: body.travel_radius_miles,
    });

    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    const allowedFields = [
      'bio',
      'services',
      'equipment',
      'travel_radius_miles',
      'availability_schedule',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateTeenProfile(c.env.DB, user!.id, updates);
    }

    const profile = await getTeenProfileByUserId(c.env.DB, user!.id);

    return c.json({ success: true, data: profile });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// Toggle availability (worker only)
workers.post('/me/availability', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { available } = await c.req.json();

    if (typeof available !== 'boolean') {
      return c.json({ success: false, error: 'Invalid availability value' }, 400);
    }

    // Check if verified before allowing to be available
    const profile = await getTeenProfileByUserId(c.env.DB, user!.id);
    if (!profile?.verified && available) {
      return c.json({ success: false, error: 'Parent consent required to mark yourself available' }, 403);
    }

    await updateTeenProfile(c.env.DB, user!.id, { available_now: available });

    return c.json({
      success: true,
      data: { available_now: available },
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    return c.json({ success: false, error: 'Failed to update availability' }, 500);
  }
});

// Get worker ratings
workers.get('/:id/ratings', requireAuth(), async (c) => {
  try {
    const { id } = c.req.param();
    const { limit, offset } = c.req.query();

    const ratings = await getRatingsForUser(c.env.DB, id, {
      publicOnly: true,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    });

    return c.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error('Get worker ratings error:', error);
    return c.json({ success: false, error: 'Failed to get ratings' }, 500);
  }
});

export default workers;
