// User database queries for A Kid and a Shovel

import type { User, TeenProfile, HomeownerProfile, ParentConsent } from '../../types';
import { generateId, now } from '../../utils/helpers';

// User queries
export async function createUser(
  db: D1Database,
  data: Omit<User, 'id' | 'created_at' | 'updated_at' | 'email_verified'>
): Promise<User> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO users (
      id, type, email, phone, password_hash, name, address, city, state, zip,
      lat, lng, email_verified, email_verification_token, stripe_customer_id,
      stripe_connect_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.type,
    data.email.toLowerCase(),
    data.phone || null,
    data.password_hash,
    data.name,
    data.address || null,
    data.city || null,
    data.state || 'OH',
    data.zip || null,
    data.lat || null,
    data.lng || null,
    data.email_verification_token || null,
    data.stripe_customer_id || null,
    data.stripe_connect_id || null,
    timestamp,
    timestamp
  ).run();

  return {
    ...data,
    id,
    email_verified: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first<User>();
  return result || null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<User>();
  return result || null;
}

export async function updateUser(
  db: D1Database,
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(id);

  await db.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function deleteUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

export async function verifyEmail(db: D1Database, token: string): Promise<User | null> {
  const user = await db.prepare(
    'SELECT * FROM users WHERE email_verification_token = ?'
  ).bind(token).first<User>();

  if (!user) return null;

  await db.prepare(
    'UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = ? WHERE id = ?'
  ).bind(now(), user.id).run();

  return { ...user, email_verified: true };
}

// Teen profile queries
export async function createTeenProfile(
  db: D1Database,
  data: Omit<TeenProfile, 'id' | 'created_at' | 'updated_at' | 'avg_rating' | 'total_ratings' | 'completed_jobs_count' | 'total_earnings' | 'future_fund_balance' | 'verified' | 'verified_at'>
): Promise<TeenProfile> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO teen_profiles (
      id, user_id, parent_user_id, age, birth_date, school_name, bio,
      profile_photo_url, services, equipment, travel_radius_miles,
      available_now, availability_schedule, verified, avg_rating,
      total_ratings, completed_jobs_count, total_earnings,
      future_fund_balance, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)
  `).bind(
    id,
    data.user_id,
    data.parent_user_id || null,
    data.age,
    data.birth_date || null,
    data.school_name || null,
    data.bio || null,
    data.profile_photo_url || null,
    JSON.stringify(data.services || []),
    JSON.stringify(data.equipment || []),
    data.travel_radius_miles || 2.0,
    data.available_now ? 1 : 0,
    JSON.stringify(data.availability_schedule || {}),
    timestamp,
    timestamp
  ).run();

  return {
    ...data,
    id,
    verified: false,
    avg_rating: 0,
    total_ratings: 0,
    completed_jobs_count: 0,
    total_earnings: 0,
    future_fund_balance: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getTeenProfileByUserId(db: D1Database, userId: string): Promise<TeenProfile | null> {
  const result = await db.prepare(
    'SELECT * FROM teen_profiles WHERE user_id = ?'
  ).bind(userId).first();

  if (!result) return null;

  return {
    ...result,
    services: JSON.parse(result.services as string || '[]'),
    equipment: JSON.parse(result.equipment as string || '[]'),
    availability_schedule: JSON.parse(result.availability_schedule as string || '{}'),
    available_now: Boolean(result.available_now),
    verified: Boolean(result.verified),
  } as TeenProfile;
}

export async function updateTeenProfile(
  db: D1Database,
  userId: string,
  data: Partial<TeenProfile>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (['id', 'user_id', 'created_at'].includes(key)) continue;

    if (key === 'services' || key === 'equipment' || key === 'availability_schedule') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(value));
    } else if (key === 'available_now' || key === 'verified') {
      fields.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    } else {
      fields.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(userId);

  await db.prepare(
    `UPDATE teen_profiles SET ${fields.join(', ')} WHERE user_id = ?`
  ).bind(...values).run();
}

export async function getAvailableWorkers(
  db: D1Database,
  options: {
    lat?: number;
    lng?: number;
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    serviceType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ user: User; profile: TeenProfile }[]> {
  let query = `
    SELECT u.*, tp.*
    FROM users u
    JOIN teen_profiles tp ON u.id = tp.user_id
    WHERE u.type = 'teen'
    AND tp.verified = 1
    AND tp.available_now = 1
  `;

  const params: (string | number)[] = [];

  if (options.minLat !== undefined && options.maxLat !== undefined) {
    query += ' AND u.lat BETWEEN ? AND ?';
    params.push(options.minLat, options.maxLat);
  }

  if (options.minLng !== undefined && options.maxLng !== undefined) {
    query += ' AND u.lng BETWEEN ? AND ?';
    params.push(options.minLng, options.maxLng);
  }

  if (options.serviceType) {
    query += ` AND tp.services LIKE ?`;
    params.push(`%"${options.serviceType}"%`);
  }

  query += ' ORDER BY tp.avg_rating DESC, tp.completed_jobs_count DESC';

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
    user: {
      id: row.id,
      type: row.type,
      email: row.email,
      phone: row.phone,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      lat: row.lat,
      lng: row.lng,
      created_at: row.created_at,
    } as User,
    profile: {
      id: row.id,
      user_id: row.user_id,
      age: row.age,
      school_name: row.school_name,
      bio: row.bio,
      profile_photo_url: row.profile_photo_url,
      services: JSON.parse(row.services as string || '[]'),
      equipment: JSON.parse(row.equipment as string || '[]'),
      travel_radius_miles: row.travel_radius_miles,
      available_now: Boolean(row.available_now),
      verified: Boolean(row.verified),
      avg_rating: row.avg_rating,
      total_ratings: row.total_ratings,
      completed_jobs_count: row.completed_jobs_count,
    } as TeenProfile,
  }));
}

// Homeowner profile queries
export async function createHomeownerProfile(
  db: D1Database,
  data: Omit<HomeownerProfile, 'id' | 'created_at' | 'updated_at' | 'avg_rating' | 'total_ratings' | 'jobs_posted_count' | 'jobs_completed_count'>
): Promise<HomeownerProfile> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO homeowner_profiles (
      id, user_id, property_type, driveway_size, walkway_length,
      special_instructions, preferred_payment_method, avg_rating,
      total_ratings, jobs_posted_count, jobs_completed_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
  `).bind(
    id,
    data.user_id,
    data.property_type || 'house',
    data.driveway_size || null,
    data.walkway_length || null,
    data.special_instructions || null,
    data.preferred_payment_method || 'cash',
    timestamp,
    timestamp
  ).run();

  return {
    ...data,
    id,
    avg_rating: 0,
    total_ratings: 0,
    jobs_posted_count: 0,
    jobs_completed_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getHomeownerProfileByUserId(db: D1Database, userId: string): Promise<HomeownerProfile | null> {
  const result = await db.prepare(
    'SELECT * FROM homeowner_profiles WHERE user_id = ?'
  ).bind(userId).first<HomeownerProfile>();
  return result || null;
}

export async function updateHomeownerProfile(
  db: D1Database,
  userId: string,
  data: Partial<HomeownerProfile>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (['id', 'user_id', 'created_at'].includes(key)) continue;
    fields.push(`${key} = ?`);
    values.push(value as string | number | null);
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(userId);

  await db.prepare(
    `UPDATE homeowner_profiles SET ${fields.join(', ')} WHERE user_id = ?`
  ).bind(...values).run();
}

// Parent consent queries
export async function createParentConsent(
  db: D1Database,
  data: Omit<ParentConsent, 'id' | 'created_at' | 'consent_given' | 'consent_given_at'>
): Promise<ParentConsent> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO parent_consents (
      id, teen_user_id, parent_user_id, parent_email, parent_name,
      consent_token, consent_given, consent_method, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).bind(
    id,
    data.teen_user_id,
    data.parent_user_id || null,
    data.parent_email.toLowerCase(),
    data.parent_name || null,
    data.consent_token,
    data.consent_method || null,
    data.expires_at || null,
    timestamp
  ).run();

  return {
    ...data,
    id,
    consent_given: false,
    created_at: timestamp,
  };
}

export async function getParentConsentByToken(db: D1Database, token: string): Promise<ParentConsent | null> {
  const result = await db.prepare(
    'SELECT * FROM parent_consents WHERE consent_token = ?'
  ).bind(token).first();

  if (!result) return null;

  return {
    ...result,
    consent_given: Boolean(result.consent_given),
  } as ParentConsent;
}

export async function grantParentConsent(
  db: D1Database,
  token: string,
  parentUserId: string | null,
  ip: string
): Promise<boolean> {
  const timestamp = now();

  const result = await db.prepare(`
    UPDATE parent_consents
    SET consent_given = 1, consent_given_at = ?, parent_user_id = ?, consent_ip = ?
    WHERE consent_token = ? AND consent_given = 0
  `).bind(timestamp, parentUserId, ip, token).run();

  if (result.meta.changes === 0) return false;

  // Get the consent to update the teen's profile
  const consent = await getParentConsentByToken(db, token);
  if (consent) {
    await updateTeenProfile(db, consent.teen_user_id, {
      parent_user_id: parentUserId || undefined,
      verified: true,
      verified_at: timestamp,
    });
  }

  return true;
}

export async function getParentConsentByTeenId(db: D1Database, teenUserId: string): Promise<ParentConsent | null> {
  const result = await db.prepare(
    'SELECT * FROM parent_consents WHERE teen_user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(teenUserId).first();

  if (!result) return null;

  return {
    ...result,
    consent_given: Boolean(result.consent_given),
  } as ParentConsent;
}
