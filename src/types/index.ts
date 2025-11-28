/**
 * Environment bindings for Cloudflare Worker
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  PHOTOS: R2Bucket;

  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;

  // Workers AI
  AI: Ai;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;

  // Environment variables
  ENVIRONMENT: string;
  APP_NAME: string;
  APP_URL: string;

  // Secrets (set via wrangler secret)
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CONNECT_CLIENT_ID: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  SESSION_SECRET: string;
}

/**
 * User types in the system
 */
export type UserType = 'homeowner' | 'teen' | 'parent';

/**
 * Job status lifecycle
 */
export type JobStatus =
  | 'posted'
  | 'claimed'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'cancelled'
  | 'disputed';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/**
 * Payment method
 */
export type PaymentMethod = 'cash' | 'stripe';

/**
 * Service types offered
 */
export type ServiceType = 'driveway' | 'walkway' | 'car_brushing' | 'combo';

/**
 * User record from database
 */
export interface User {
  id: string;
  type: UserType;
  email: string;
  phone: string | null;
  password_hash: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  stripe_customer_id: string | null;
  stripe_connect_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Teen profile record
 */
export interface TeenProfile {
  id: string;
  user_id: string;
  parent_user_id: string | null;
  age: number;
  school_name: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  services: string[]; // JSON parsed
  equipment: string[]; // JSON parsed
  travel_radius_miles: number;
  available_now: boolean;
  verified: boolean;
  verified_at: string | null;
  avg_rating: number;
  completed_jobs_count: number;
  total_earnings: number;
  future_fund_balance: number;
  created_at: string;
}

/**
 * Homeowner profile record
 */
export interface HomeownerProfile {
  id: string;
  user_id: string;
  property_type: string;
  driveway_size: string | null;
  special_instructions: string | null;
  avg_rating: number;
  jobs_posted_count: number;
  created_at: string;
}

/**
 * Job record
 */
export interface Job {
  id: string;
  homeowner_id: string;
  worker_id: string | null;
  status: JobStatus;
  service_type: ServiceType;
  address: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  price_offered: number | null;
  price_accepted: number | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  scheduled_for: string | null;
  claimed_at: string | null;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Rating record
 */
export interface Rating {
  id: string;
  job_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;
  review_text: string | null;
  rating_categories: Record<string, number> | null;
  created_at: string;
}

/**
 * Session data stored in KV
 */
export interface SessionData {
  userId: string;
  userType: UserType;
  email: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Location coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}
