// Rating database queries for A Kid and a Shovel

import type { Rating } from '../../types';
import { generateId, now } from '../../utils/helpers';

export async function createRating(
  db: D1Database,
  data: Omit<Rating, 'id' | 'created_at'>
): Promise<Rating> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO ratings (
      id, job_id, rater_id, rated_id, rater_type, rating, review_text,
      quality_rating, punctuality_rating, communication_rating,
      payment_rating, accuracy_rating, treatment_rating,
      would_hire_again, would_work_again, is_public, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.job_id,
    data.rater_id,
    data.rated_id,
    data.rater_type,
    data.rating,
    data.review_text || null,
    data.quality_rating || null,
    data.punctuality_rating || null,
    data.communication_rating || null,
    data.payment_rating || null,
    data.accuracy_rating || null,
    data.treatment_rating || null,
    data.would_hire_again === undefined ? null : (data.would_hire_again ? 1 : 0),
    data.would_work_again === undefined ? null : (data.would_work_again ? 1 : 0),
    data.is_public ? 1 : 0,
    timestamp
  ).run();

  // Update the rated user's average rating
  await updateUserAverageRating(db, data.rated_id, data.rater_type === 'homeowner' ? 'teen' : 'homeowner');

  return {
    ...data,
    id,
    created_at: timestamp,
  };
}

export async function getRatingById(db: D1Database, id: string): Promise<Rating | null> {
  const result = await db.prepare(
    'SELECT * FROM ratings WHERE id = ?'
  ).bind(id).first();

  if (!result) return null;

  return {
    ...result,
    would_hire_again: result.would_hire_again === null ? undefined : Boolean(result.would_hire_again),
    would_work_again: result.would_work_again === null ? undefined : Boolean(result.would_work_again),
    is_public: Boolean(result.is_public),
  } as Rating;
}

export async function getRatingByJobAndRater(
  db: D1Database,
  jobId: string,
  raterId: string
): Promise<Rating | null> {
  const result = await db.prepare(
    'SELECT * FROM ratings WHERE job_id = ? AND rater_id = ?'
  ).bind(jobId, raterId).first();

  if (!result) return null;

  return {
    ...result,
    would_hire_again: result.would_hire_again === null ? undefined : Boolean(result.would_hire_again),
    would_work_again: result.would_work_again === null ? undefined : Boolean(result.would_work_again),
    is_public: Boolean(result.is_public),
  } as Rating;
}

export async function getRatingsForUser(
  db: D1Database,
  userId: string,
  options: {
    publicOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Rating[]> {
  let query = 'SELECT * FROM ratings WHERE rated_id = ?';
  const params: (string | number)[] = [userId];

  if (options.publicOnly) {
    query += ' AND is_public = 1';
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const results = await db.prepare(query).bind(...params).all();

  return (results.results || []).map(row => ({
    ...row,
    would_hire_again: row.would_hire_again === null ? undefined : Boolean(row.would_hire_again),
    would_work_again: row.would_work_again === null ? undefined : Boolean(row.would_work_again),
    is_public: Boolean(row.is_public),
  })) as Rating[];
}

export async function getRatingsForJob(db: D1Database, jobId: string): Promise<Rating[]> {
  const results = await db.prepare(
    'SELECT * FROM ratings WHERE job_id = ? ORDER BY created_at DESC'
  ).bind(jobId).all();

  return (results.results || []).map(row => ({
    ...row,
    would_hire_again: row.would_hire_again === null ? undefined : Boolean(row.would_hire_again),
    would_work_again: row.would_work_again === null ? undefined : Boolean(row.would_work_again),
    is_public: Boolean(row.is_public),
  })) as Rating[];
}

export async function getUserRatingStats(
  db: D1Database,
  userId: string
): Promise<{
  avg_rating: number;
  total_ratings: number;
  rating_distribution: Record<number, number>;
}> {
  const result = await db.prepare(`
    SELECT
      AVG(rating) as avg_rating,
      COUNT(*) as total_ratings
    FROM ratings
    WHERE rated_id = ?
  `).bind(userId).first<{ avg_rating: number; total_ratings: number }>();

  const distributionResult = await db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM ratings
    WHERE rated_id = ?
    GROUP BY rating
  `).bind(userId).all();

  const rating_distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distributionResult.results || []) {
    rating_distribution[row.rating as number] = row.count as number;
  }

  return {
    avg_rating: result?.avg_rating || 0,
    total_ratings: result?.total_ratings || 0,
    rating_distribution,
  };
}

async function updateUserAverageRating(
  db: D1Database,
  userId: string,
  userType: 'teen' | 'homeowner'
): Promise<void> {
  const stats = await getUserRatingStats(db, userId);

  if (userType === 'teen') {
    await db.prepare(`
      UPDATE teen_profiles
      SET avg_rating = ?, total_ratings = ?, updated_at = ?
      WHERE user_id = ?
    `).bind(stats.avg_rating, stats.total_ratings, now(), userId).run();
  } else {
    await db.prepare(`
      UPDATE homeowner_profiles
      SET avg_rating = ?, total_ratings = ?, updated_at = ?
      WHERE user_id = ?
    `).bind(stats.avg_rating, stats.total_ratings, now(), userId).run();
  }
}

export async function hasRatedJob(
  db: D1Database,
  jobId: string,
  raterId: string
): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM ratings WHERE job_id = ? AND rater_id = ?'
  ).bind(jobId, raterId).first();

  return result !== null;
}

export async function getRecentRatingsForDisplay(
  db: D1Database,
  userId: string,
  limit: number = 5
): Promise<(Rating & { rater_name: string })[]> {
  const results = await db.prepare(`
    SELECT r.*, u.name as rater_name
    FROM ratings r
    JOIN users u ON r.rater_id = u.id
    WHERE r.rated_id = ? AND r.is_public = 1
    ORDER BY r.created_at DESC
    LIMIT ?
  `).bind(userId, limit).all();

  return (results.results || []).map(row => ({
    ...row,
    would_hire_again: row.would_hire_again === null ? undefined : Boolean(row.would_hire_again),
    would_work_again: row.would_work_again === null ? undefined : Boolean(row.would_work_again),
    is_public: Boolean(row.is_public),
  })) as (Rating & { rater_name: string })[];
}
