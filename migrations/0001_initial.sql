-- A Kid and a Shovel - Initial Database Schema
-- Cloudflare D1 (SQLite)

-- Users table (all types: homeowner, teen, parent)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('homeowner', 'teen', 'parent')),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'OH',
  zip TEXT,
  lat REAL,
  lng REAL,
  stripe_customer_id TEXT,
  stripe_connect_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Teen worker profiles
CREATE TABLE teen_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  parent_user_id TEXT,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 17),
  school_name TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  services TEXT DEFAULT '[]',
  equipment TEXT DEFAULT '[]',
  travel_radius_miles REAL DEFAULT 2.0,
  available_now INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  avg_rating REAL DEFAULT 0,
  completed_jobs_count INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  future_fund_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Homeowner profiles
CREATE TABLE homeowner_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  property_type TEXT DEFAULT 'house',
  driveway_size TEXT,
  special_instructions TEXT,
  avg_rating REAL DEFAULT 0,
  jobs_posted_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parent consent records
CREATE TABLE parent_consents (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  parent_user_id TEXT,
  parent_email TEXT NOT NULL,
  consent_token TEXT UNIQUE NOT NULL,
  consent_given INTEGER DEFAULT 0,
  consent_given_at TEXT,
  consent_method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teen_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Teen references
CREATE TABLE teen_references (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_contact TEXT,
  reference_relationship TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teen_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  homeowner_id TEXT NOT NULL,
  worker_id TEXT,
  status TEXT DEFAULT 'posted' CHECK (status IN ('posted', 'claimed', 'confirmed', 'in_progress', 'completed', 'reviewed', 'cancelled', 'disputed')),
  service_type TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  description TEXT,
  price_offered REAL,
  price_accepted REAL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'stripe')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  scheduled_for TEXT,
  claimed_at TEXT,
  confirmed_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  reviewed_at TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  homeowner_confirmed INTEGER DEFAULT 0,
  worker_confirmed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Ratings
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  rating_categories TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Savings goals (for teens)
CREATE TABLE savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  achieved INTEGER DEFAULT 0,
  achieved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Earnings ledger
CREATE TABLE earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  platform_fee REAL NOT NULL,
  future_fund_contribution REAL NOT NULL,
  net_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Weather alerts log
CREATE TABLE weather_alerts (
  id TEXT PRIMARY KEY,
  forecast_date TEXT NOT NULL,
  snow_inches_min REAL,
  snow_inches_max REAL,
  alert_type TEXT,
  notifications_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Northeast Ohio ZIP codes (for geographic validation)
CREATE TABLE neo_zip_codes (
  zip TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  county TEXT,
  lat REAL,
  lng REAL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_zip ON users(zip);
CREATE INDEX idx_users_location ON users(lat, lng);

CREATE INDEX idx_teen_profiles_user ON teen_profiles(user_id);
CREATE INDEX idx_teen_profiles_available ON teen_profiles(available_now);
CREATE INDEX idx_teen_profiles_verified ON teen_profiles(verified);

CREATE INDEX idx_homeowner_profiles_user ON homeowner_profiles(user_id);

CREATE INDEX idx_parent_consents_teen ON parent_consents(teen_user_id);
CREATE INDEX idx_parent_consents_token ON parent_consents(consent_token);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_homeowner ON jobs(homeowner_id);
CREATE INDEX idx_jobs_worker ON jobs(worker_id);
CREATE INDEX idx_jobs_location ON jobs(lat, lng);
CREATE INDEX idx_jobs_created ON jobs(created_at);

CREATE INDEX idx_ratings_job ON ratings(job_id);
CREATE INDEX idx_ratings_rated ON ratings(rated_id);
CREATE INDEX idx_ratings_rater ON ratings(rater_id);

CREATE INDEX idx_push_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_endpoint ON push_subscriptions(endpoint);

CREATE INDEX idx_savings_user ON savings_goals(user_id);

CREATE INDEX idx_earnings_user ON earnings(user_id);
CREATE INDEX idx_earnings_job ON earnings(job_id);
CREATE INDEX idx_earnings_created ON earnings(created_at);

CREATE INDEX idx_weather_date ON weather_alerts(forecast_date);
