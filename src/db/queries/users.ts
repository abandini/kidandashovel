/**
 * User database queries
 */

import type { User, UserType, HomeownerProfile, TeenProfile } from '../../types';
import { generateId } from '../../utils/helpers';

/**
 * Create a new user
 */
export async function createUser(
  db: D1Database,
  data: {
    type: UserType;
    email: string;
    password_hash: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  }
): Promise<User> {
  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO users (id, type, email, password_hash, name, phone, address, city, state, zip, lat, lng, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OH', ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.type,
      data.email.toLowerCase(),
      data.password_hash,
      data.name,
      data.phone || null,
      data.address || null,
      data.city || null,
      data.zip || null,
      data.lat || null,
      data.lng || null,
      now,
      now
    )
    .run();

  return {
    id,
    type: data.type,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    password_hash: data.password_hash,
    name: data.name,
    address: data.address || null,
    city: data.city || null,
    state: 'OH',
    zip: data.zip || null,
    lat: data.lat || null,
    lng: data.lng || null,
    stripe_customer_id: null,
    stripe_connect_id: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<User>();
  return result || null;
}

/**
 * Get user by ID
 */
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return result || null;
}

/**
 * Create homeowner profile
 */
export async function createHomeownerProfile(
  db: D1Database,
  data: {
    user_id: string;
    property_type?: string;
    driveway_size?: string;
    special_instructions?: string;
  }
): Promise<HomeownerProfile> {
  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO homeowner_profiles (id, user_id, property_type, driveway_size, special_instructions, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.user_id,
      data.property_type || 'house',
      data.driveway_size || null,
      data.special_instructions || null,
      now
    )
    .run();

  return {
    id,
    user_id: data.user_id,
    property_type: data.property_type || 'house',
    driveway_size: data.driveway_size || null,
    special_instructions: data.special_instructions || null,
    avg_rating: 0,
    jobs_posted_count: 0,
    created_at: now,
  };
}

/**
 * Get homeowner profile by user ID
 */
export async function getHomeownerProfileByUserId(
  db: D1Database,
  userId: string
): Promise<HomeownerProfile | null> {
  const result = await db
    .prepare('SELECT * FROM homeowner_profiles WHERE user_id = ?')
    .bind(userId)
    .first<HomeownerProfile>();
  return result || null;
}

/**
 * Create teen profile
 */
export async function createTeenProfile(
  db: D1Database,
  data: {
    user_id: string;
    age: number;
    school_name?: string;
    bio?: string;
    services?: string[];
    equipment?: string[];
    travel_radius_miles?: number;
  }
): Promise<TeenProfile> {
  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO teen_profiles (id, user_id, age, school_name, bio, services, equipment, travel_radius_miles, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.user_id,
      data.age,
      data.school_name || null,
      data.bio || null,
      JSON.stringify(data.services || []),
      JSON.stringify(data.equipment || []),
      data.travel_radius_miles || 2.0,
      now
    )
    .run();

  return {
    id,
    user_id: data.user_id,
    parent_user_id: null,
    age: data.age,
    school_name: data.school_name || null,
    bio: data.bio || null,
    profile_photo_url: null,
    services: data.services || [],
    equipment: data.equipment || [],
    travel_radius_miles: data.travel_radius_miles || 2.0,
    available_now: false,
    verified: false,
    verified_at: null,
    avg_rating: 0,
    completed_jobs_count: 0,
    total_earnings: 0,
    future_fund_balance: 0,
    created_at: now,
  };
}

/**
 * Get teen profile by user ID
 */
export async function getTeenProfileByUserId(db: D1Database, userId: string): Promise<TeenProfile | null> {
  const result = await db.prepare('SELECT * FROM teen_profiles WHERE user_id = ?').bind(userId).first();
  if (!result) return null;

  return {
    ...result,
    services: JSON.parse((result as Record<string, unknown>).services as string || '[]'),
    equipment: JSON.parse((result as Record<string, unknown>).equipment as string || '[]'),
    available_now: Boolean((result as Record<string, unknown>).available_now),
    verified: Boolean((result as Record<string, unknown>).verified),
  } as TeenProfile;
}

/**
 * Check if email already exists
 */
export async function emailExists(db: D1Database, email: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();
  return result !== null;
}

/**
 * Update user
 */
export async function updateUser(
  db: D1Database,
  id: string,
  updates: Partial<Pick<User, 'name' | 'phone' | 'address' | 'city' | 'zip' | 'lat' | 'lng'>>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.address !== undefined) {
    fields.push('address = ?');
    values.push(updates.address);
  }
  if (updates.city !== undefined) {
    fields.push('city = ?');
    values.push(updates.city);
  }
  if (updates.zip !== undefined) {
    fields.push('zip = ?');
    values.push(updates.zip);
  }
  if (updates.lat !== undefined) {
    fields.push('lat = ?');
    values.push(updates.lat);
  }
  if (updates.lng !== undefined) {
    fields.push('lng = ?');
    values.push(updates.lng);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
}
