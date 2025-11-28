// Core type definitions for A Kid and a Shovel

// User types
export type UserType = 'homeowner' | 'teen' | 'parent';

export interface User {
  id: string;
  type: UserType;
  email: string;
  phone?: string;
  password_hash: string;
  name: string;
  address?: string;
  city?: string;
  state: string;
  zip?: string;
  lat?: number;
  lng?: number;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  stripe_customer_id?: string;
  stripe_connect_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TeenProfile {
  id: string;
  user_id: string;
  parent_user_id?: string;
  age: number;
  birth_date?: string;
  school_name?: string;
  bio?: string;
  profile_photo_url?: string;
  services: ServiceType[];
  equipment: EquipmentType[];
  travel_radius_miles: number;
  available_now: boolean;
  availability_schedule: AvailabilitySchedule;
  verified: boolean;
  verified_at?: string;
  avg_rating: number;
  total_ratings: number;
  completed_jobs_count: number;
  total_earnings: number;
  future_fund_balance: number;
  created_at: string;
  updated_at: string;
}

export interface HomeownerProfile {
  id: string;
  user_id: string;
  property_type: PropertyType;
  driveway_size?: DrivewaySize;
  walkway_length?: string;
  special_instructions?: string;
  preferred_payment_method: PaymentMethod;
  avg_rating: number;
  total_ratings: number;
  jobs_posted_count: number;
  jobs_completed_count: number;
  created_at: string;
  updated_at: string;
}

export interface ParentConsent {
  id: string;
  teen_user_id: string;
  parent_user_id?: string;
  parent_email: string;
  parent_name?: string;
  consent_token: string;
  consent_given: boolean;
  consent_given_at?: string;
  consent_method?: ConsentMethod;
  consent_ip?: string;
  created_at: string;
  expires_at?: string;
}

// Service and equipment types
export type ServiceType = 'driveway' | 'walkway' | 'car_brushing' | 'salting' | 'combo';
export type EquipmentType = 'shovel' | 'snow_blower' | 'salt_spreader' | 'ice_scraper' | 'broom';
export type PropertyType = 'house' | 'condo' | 'apartment' | 'townhouse';
export type DrivewaySize = 'small' | 'medium' | 'large' | 'extra_large';
export type PaymentMethod = 'cash' | 'stripe';
export type ConsentMethod = 'email_link' | 'in_app' | 'docusign';

// Availability schedule
export interface AvailabilitySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;
}

// Job types
export type JobStatus = 'posted' | 'claimed' | 'confirmed' | 'in_progress' | 'completed' | 'reviewed' | 'cancelled' | 'disputed';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

export interface Job {
  id: string;
  homeowner_id: string;
  worker_id?: string;
  status: JobStatus;
  service_type: ServiceType;
  address: string;
  city?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  description?: string;
  special_instructions?: string;
  estimated_duration_minutes?: number;
  price_offered?: number;
  price_accepted?: number;
  price_final?: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  stripe_payment_intent_id?: string;
  scheduled_for?: string;
  scheduled_window?: string;
  is_asap: boolean;
  claimed_at?: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  reviewed_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  before_photo_url?: string;
  after_photo_url?: string;
  additional_photos: string[];
  worker_notes?: string;
  homeowner_notes?: string;
  created_at: string;
  updated_at: string;
}

// Rating types
export interface Rating {
  id: string;
  job_id: string;
  rater_id: string;
  rated_id: string;
  rater_type: 'homeowner' | 'teen';
  rating: number;
  review_text?: string;
  quality_rating?: number;
  punctuality_rating?: number;
  communication_rating?: number;
  payment_rating?: number;
  accuracy_rating?: number;
  treatment_rating?: number;
  would_hire_again?: boolean;
  would_work_again?: boolean;
  is_public: boolean;
  created_at: string;
}

// Financial types
export interface Earnings {
  id: string;
  user_id: string;
  job_id: string;
  gross_amount: number;
  platform_fee: number;
  future_fund_contribution: number;
  net_amount: number;
  payment_method: PaymentMethod;
  stripe_transfer_id?: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
  achieved: boolean;
  achieved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsSummary {
  total_earned: number;
  this_month: number;
  this_week: number;
  jobs_completed: number;
  average_per_job: number;
  future_fund_balance: number;
  future_fund_projected: number;
}

// Push notification types
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  device_name?: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Weather types
export interface WeatherAlert {
  id: string;
  forecast_date: string;
  forecast_period?: string;
  snow_inches_min?: number;
  snow_inches_max?: number;
  alert_type: 'light' | 'moderate' | 'heavy';
  alert_message?: string;
  raw_forecast?: string;
  notifications_sent: number;
  created_at: string;
}

export interface WeatherForecast {
  periods: ForecastPeriod[];
  updated_at: string;
}

export interface ForecastPeriod {
  name: string;
  start_time: string;
  end_time: string;
  temperature: number;
  temperature_unit: string;
  wind_speed: string;
  wind_direction: string;
  short_forecast: string;
  detailed_forecast: string;
  precipitation_probability?: number;
}

// Session types
export interface Session {
  id: string;
  user_id: string;
  user: User;
  expires_at: string;
  created_at: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Worker with profile (for listings)
export interface WorkerListing {
  user: User;
  profile: TeenProfile;
  distance_miles?: number;
  recent_ratings?: Rating[];
}

// Job with details (for listings)
export interface JobListing {
  job: Job;
  homeowner: User;
  homeowner_profile: HomeownerProfile;
  worker?: User;
  worker_profile?: TeenProfile;
  distance_miles?: number;
}

// Environment bindings
export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  AI: Ai;
  RATE_LIMITER: DurableObjectNamespace;

  // Secrets
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CONNECT_CLIENT_ID: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  SESSION_SECRET: string;

  // Vars
  ENVIRONMENT: string;
  APP_URL: string;
  NEO_ZIP_PREFIXES: string;
}

// Context with authenticated user
export interface AppContext {
  user?: User;
  session?: Session;
}
