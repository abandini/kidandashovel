// Job database queries for A Kid and a Shovel

import type { Job, JobStatus, PaymentStatus } from '../../types';
import { generateId, now } from '../../utils/helpers';

export async function createJob(
  db: D1Database,
  data: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'status' | 'payment_status'>
): Promise<Job> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO jobs (
      id, homeowner_id, worker_id, status, service_type, address, city, zip,
      lat, lng, description, special_instructions, estimated_duration_minutes,
      price_offered, price_accepted, price_final, payment_method, payment_status,
      stripe_payment_intent_id, scheduled_for, scheduled_window, is_asap,
      before_photo_url, after_photo_url, additional_photos, worker_notes,
      homeowner_notes, created_at, updated_at
    ) VALUES (?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.homeowner_id,
    data.worker_id || null,
    data.service_type,
    data.address,
    data.city || null,
    data.zip || null,
    data.lat || null,
    data.lng || null,
    data.description || null,
    data.special_instructions || null,
    data.estimated_duration_minutes || null,
    data.price_offered || null,
    data.price_accepted || null,
    data.price_final || null,
    data.payment_method || null,
    data.stripe_payment_intent_id || null,
    data.scheduled_for || null,
    data.scheduled_window || null,
    data.is_asap ? 1 : 0,
    data.before_photo_url || null,
    data.after_photo_url || null,
    JSON.stringify(data.additional_photos || []),
    data.worker_notes || null,
    data.homeowner_notes || null,
    timestamp,
    timestamp
  ).run();

  return {
    ...data,
    id,
    status: 'posted',
    payment_status: 'pending',
    additional_photos: data.additional_photos || [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getJobById(db: D1Database, id: string): Promise<Job | null> {
  const result = await db.prepare(
    'SELECT * FROM jobs WHERE id = ?'
  ).bind(id).first();

  if (!result) return null;

  return {
    ...result,
    is_asap: Boolean(result.is_asap),
    additional_photos: JSON.parse(result.additional_photos as string || '[]'),
  } as Job;
}

export async function updateJob(
  db: D1Database,
  id: string,
  data: Partial<Job>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (['id', 'created_at'].includes(key)) continue;

    if (key === 'additional_photos') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(value));
    } else if (key === 'is_asap') {
      fields.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    } else {
      fields.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(id);

  await db.prepare(
    `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function claimJob(
  db: D1Database,
  jobId: string,
  workerId: string
): Promise<boolean> {
  const timestamp = now();

  const result = await db.prepare(`
    UPDATE jobs
    SET worker_id = ?, status = 'claimed', claimed_at = ?, updated_at = ?
    WHERE id = ? AND status = 'posted' AND worker_id IS NULL
  `).bind(workerId, timestamp, timestamp, jobId).run();

  return result.meta.changes > 0;
}

export async function confirmJob(
  db: D1Database,
  jobId: string,
  userId: string,
  priceAccepted?: number
): Promise<boolean> {
  const timestamp = now();

  // First verify the user is the homeowner or worker for this job
  const job = await getJobById(db, jobId);
  if (!job) return false;

  if (job.homeowner_id !== userId && job.worker_id !== userId) {
    return false;
  }

  const updates: Partial<Job> = {
    status: 'confirmed',
    confirmed_at: timestamp,
  };

  if (priceAccepted !== undefined) {
    updates.price_accepted = priceAccepted;
  }

  await updateJob(db, jobId, updates);
  return true;
}

export async function startJob(
  db: D1Database,
  jobId: string,
  workerId: string,
  beforePhotoUrl?: string
): Promise<boolean> {
  const timestamp = now();

  const result = await db.prepare(`
    UPDATE jobs
    SET status = 'in_progress', started_at = ?, before_photo_url = ?, updated_at = ?
    WHERE id = ? AND worker_id = ? AND status = 'confirmed'
  `).bind(timestamp, beforePhotoUrl || null, timestamp, jobId, workerId).run();

  return result.meta.changes > 0;
}

export async function completeJob(
  db: D1Database,
  jobId: string,
  workerId: string,
  afterPhotoUrl?: string,
  workerNotes?: string
): Promise<boolean> {
  const timestamp = now();

  const result = await db.prepare(`
    UPDATE jobs
    SET status = 'completed', completed_at = ?, after_photo_url = ?, worker_notes = ?, updated_at = ?
    WHERE id = ? AND worker_id = ? AND status = 'in_progress'
  `).bind(timestamp, afterPhotoUrl || null, workerNotes || null, timestamp, jobId, workerId).run();

  return result.meta.changes > 0;
}

export async function cancelJob(
  db: D1Database,
  jobId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  const timestamp = now();

  // Verify user is homeowner or worker
  const job = await getJobById(db, jobId);
  if (!job) return false;

  if (job.homeowner_id !== userId && job.worker_id !== userId) {
    return false;
  }

  // Can only cancel if not already completed or reviewed
  if (['completed', 'reviewed'].includes(job.status)) {
    return false;
  }

  await updateJob(db, jobId, {
    status: 'cancelled',
    cancelled_at: timestamp,
    cancelled_by: userId,
    cancellation_reason: reason,
  });

  return true;
}

export async function markJobReviewed(
  db: D1Database,
  jobId: string
): Promise<void> {
  await updateJob(db, jobId, {
    status: 'reviewed',
    reviewed_at: now(),
  });
}

export async function updatePaymentStatus(
  db: D1Database,
  jobId: string,
  status: PaymentStatus,
  stripePaymentIntentId?: string
): Promise<void> {
  const updates: Partial<Job> = {
    payment_status: status,
  };

  if (stripePaymentIntentId) {
    updates.stripe_payment_intent_id = stripePaymentIntentId;
  }

  await updateJob(db, jobId, updates);
}

// Query jobs by various criteria
export async function getJobsByHomeowner(
  db: D1Database,
  homeownerId: string,
  status?: JobStatus | JobStatus[],
  limit: number = 50,
  offset: number = 0
): Promise<Job[]> {
  let query = 'SELECT * FROM jobs WHERE homeowner_id = ?';
  const params: (string | number)[] = [homeownerId];

  if (status) {
    if (Array.isArray(status)) {
      query += ` AND status IN (${status.map(() => '?').join(', ')})`;
      params.push(...status);
    } else {
      query += ' AND status = ?';
      params.push(status);
    }
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await db.prepare(query).bind(...params).all();

  return (results.results || []).map(row => ({
    ...row,
    is_asap: Boolean(row.is_asap),
    additional_photos: JSON.parse(row.additional_photos as string || '[]'),
  })) as Job[];
}

export async function getJobsByWorker(
  db: D1Database,
  workerId: string,
  status?: JobStatus | JobStatus[],
  limit: number = 50,
  offset: number = 0
): Promise<Job[]> {
  let query = 'SELECT * FROM jobs WHERE worker_id = ?';
  const params: (string | number)[] = [workerId];

  if (status) {
    if (Array.isArray(status)) {
      query += ` AND status IN (${status.map(() => '?').join(', ')})`;
      params.push(...status);
    } else {
      query += ' AND status = ?';
      params.push(status);
    }
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await db.prepare(query).bind(...params).all();

  return (results.results || []).map(row => ({
    ...row,
    is_asap: Boolean(row.is_asap),
    additional_photos: JSON.parse(row.additional_photos as string || '[]'),
  })) as Job[];
}

export async function getAvailableJobs(
  db: D1Database,
  options: {
    lat?: number;
    lng?: number;
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    serviceType?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }
): Promise<Job[]> {
  let query = `SELECT * FROM jobs WHERE status = 'posted'`;
  const params: (string | number)[] = [];

  if (options.minLat !== undefined && options.maxLat !== undefined) {
    query += ' AND lat BETWEEN ? AND ?';
    params.push(options.minLat, options.maxLat);
  }

  if (options.minLng !== undefined && options.maxLng !== undefined) {
    query += ' AND lng BETWEEN ? AND ?';
    params.push(options.minLng, options.maxLng);
  }

  if (options.serviceType) {
    query += ' AND service_type = ?';
    params.push(options.serviceType);
  }

  if (options.minPrice !== undefined) {
    query += ' AND price_offered >= ?';
    params.push(options.minPrice);
  }

  if (options.maxPrice !== undefined) {
    query += ' AND price_offered <= ?';
    params.push(options.maxPrice);
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
    is_asap: Boolean(row.is_asap),
    additional_photos: JSON.parse(row.additional_photos as string || '[]'),
  })) as Job[];
}

export async function countJobsByStatus(
  db: D1Database,
  userId: string,
  userType: 'homeowner' | 'worker'
): Promise<Record<JobStatus, number>> {
  const column = userType === 'homeowner' ? 'homeowner_id' : 'worker_id';

  const results = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM jobs
    WHERE ${column} = ?
    GROUP BY status
  `).bind(userId).all();

  const counts: Record<string, number> = {
    posted: 0,
    claimed: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    reviewed: 0,
    cancelled: 0,
    disputed: 0,
  };

  for (const row of results.results || []) {
    counts[row.status as string] = row.count as number;
  }

  return counts as Record<JobStatus, number>;
}
