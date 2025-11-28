-- A Kid and a Shovel - Initial Database Schema
-- Hyperlocal marketplace for snow removal services

-- Users table (all types)
CREATE TABLE IF NOT EXISTS users (
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
  email_verified INTEGER DEFAULT 0,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  stripe_customer_id TEXT,
  stripe_connect_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Teen profiles (extends users)
CREATE TABLE IF NOT EXISTS teen_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  parent_user_id TEXT,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 17),
  birth_date TEXT,
  school_name TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  services TEXT DEFAULT '[]',
  equipment TEXT DEFAULT '[]',
  travel_radius_miles REAL DEFAULT 2.0,
  available_now INTEGER DEFAULT 0,
  availability_schedule TEXT DEFAULT '{}',
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  avg_rating REAL DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  completed_jobs_count INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  future_fund_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Homeowner profiles
CREATE TABLE IF NOT EXISTS homeowner_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  property_type TEXT DEFAULT 'house',
  driveway_size TEXT,
  walkway_length TEXT,
  special_instructions TEXT,
  preferred_payment_method TEXT DEFAULT 'cash',
  avg_rating REAL DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  jobs_posted_count INTEGER DEFAULT 0,
  jobs_completed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parent consents
CREATE TABLE IF NOT EXISTS parent_consents (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  parent_user_id TEXT,
  parent_email TEXT NOT NULL,
  parent_name TEXT,
  consent_token TEXT UNIQUE NOT NULL,
  consent_given INTEGER DEFAULT 0,
  consent_given_at TEXT,
  consent_method TEXT,
  consent_ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (teen_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Teen references
CREATE TABLE IF NOT EXISTS teen_references (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_contact TEXT,
  reference_relationship TEXT,
  reference_notes TEXT,
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teen_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  homeowner_id TEXT NOT NULL,
  worker_id TEXT,
  status TEXT DEFAULT 'posted' CHECK (status IN ('posted', 'claimed', 'confirmed', 'in_progress', 'completed', 'reviewed', 'cancelled', 'disputed')),
  service_type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  lat REAL,
  lng REAL,
  description TEXT,
  special_instructions TEXT,
  estimated_duration_minutes INTEGER,
  price_offered REAL,
  price_accepted REAL,
  price_final REAL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'stripe', NULL)),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  scheduled_for TEXT,
  scheduled_window TEXT,
  is_asap INTEGER DEFAULT 1,
  claimed_at TEXT,
  confirmed_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  reviewed_at TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  additional_photos TEXT DEFAULT '[]',
  worker_notes TEXT,
  homeowner_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  rater_type TEXT NOT NULL CHECK (rater_type IN ('homeowner', 'teen')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  payment_rating INTEGER CHECK (payment_rating >= 1 AND payment_rating <= 5),
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  treatment_rating INTEGER CHECK (treatment_rating >= 1 AND treatment_rating <= 5),
  would_hire_again INTEGER,
  would_work_again INTEGER,
  is_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Savings goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  priority INTEGER DEFAULT 0,
  achieved INTEGER DEFAULT 0,
  achieved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Earnings ledger
CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  platform_fee REAL NOT NULL,
  future_fund_contribution REAL NOT NULL,
  net_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Weather alerts log
CREATE TABLE IF NOT EXISTS weather_alerts (
  id TEXT PRIMARY KEY,
  forecast_date TEXT NOT NULL,
  forecast_period TEXT,
  snow_inches_min REAL,
  snow_inches_max REAL,
  alert_type TEXT,
  alert_message TEXT,
  raw_forecast TEXT,
  notifications_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notification log
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  channel TEXT DEFAULT 'push',
  sent_at TEXT,
  read_at TEXT,
  clicked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table (backup for KV)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_active_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- NEO ZIP codes for geographic validation
CREATE TABLE IF NOT EXISTS neo_zip_codes (
  zip TEXT PRIMARY KEY,
  city TEXT,
  county TEXT,
  lat REAL,
  lng REAL
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(lat, lng);

CREATE INDEX IF NOT EXISTS idx_teen_profiles_user ON teen_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teen_profiles_available ON teen_profiles(available_now);
CREATE INDEX IF NOT EXISTS idx_teen_profiles_verified ON teen_profiles(verified);

CREATE INDEX IF NOT EXISTS idx_homeowner_profiles_user ON homeowner_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(lat, lng);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_ratings_rated ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_job ON ratings(job_id);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_active ON push_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created ON earnings(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_parent_consents_teen ON parent_consents(teen_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_consents_token ON parent_consents(consent_token);

-- Insert common NEO ZIP codes
INSERT OR IGNORE INTO neo_zip_codes (zip, city, county, lat, lng) VALUES
('44101', 'Cleveland', 'Cuyahoga', 41.4995, -81.6954),
('44102', 'Cleveland', 'Cuyahoga', 41.4767, -81.7412),
('44103', 'Cleveland', 'Cuyahoga', 41.5114, -81.6414),
('44104', 'Cleveland', 'Cuyahoga', 41.4839, -81.6199),
('44105', 'Cleveland', 'Cuyahoga', 41.4485, -81.6323),
('44106', 'Cleveland', 'Cuyahoga', 41.5085, -81.6077),
('44107', 'Lakewood', 'Cuyahoga', 41.4823, -81.7982),
('44108', 'Cleveland', 'Cuyahoga', 41.5406, -81.6204),
('44109', 'Cleveland', 'Cuyahoga', 41.4447, -81.6969),
('44110', 'Cleveland', 'Cuyahoga', 41.5656, -81.5721),
('44111', 'Cleveland', 'Cuyahoga', 41.4584, -81.7873),
('44112', 'Cleveland', 'Cuyahoga', 41.5356, -81.5721),
('44113', 'Cleveland', 'Cuyahoga', 41.4839, -81.6969),
('44114', 'Cleveland', 'Cuyahoga', 41.5045, -81.6633),
('44115', 'Cleveland', 'Cuyahoga', 41.4839, -81.6633),
('44116', 'Rocky River', 'Cuyahoga', 41.4734, -81.8524),
('44117', 'Euclid', 'Cuyahoga', 41.5749, -81.5244),
('44118', 'Cleveland Heights', 'Cuyahoga', 41.5201, -81.5564),
('44119', 'Cleveland', 'Cuyahoga', 41.5859, -81.5443),
('44120', 'Shaker Heights', 'Cuyahoga', 41.4679, -81.5564),
('44121', 'South Euclid', 'Cuyahoga', 41.5234, -81.5244),
('44122', 'Beachwood', 'Cuyahoga', 41.4645, -81.5084),
('44123', 'Euclid', 'Cuyahoga', 41.6049, -81.5244),
('44124', 'Mayfield Heights', 'Cuyahoga', 41.5201, -81.4604),
('44125', 'Garfield Heights', 'Cuyahoga', 41.4145, -81.6077),
('44126', 'Fairview Park', 'Cuyahoga', 41.4411, -81.8524),
('44127', 'Cleveland', 'Cuyahoga', 41.4345, -81.6633),
('44128', 'Cleveland', 'Cuyahoga', 41.4378, -81.5404),
('44129', 'Parma', 'Cuyahoga', 41.3844, -81.7332),
('44130', 'Parma Heights', 'Cuyahoga', 41.3878, -81.7652),
('44131', 'Independence', 'Cuyahoga', 41.3978, -81.6633),
('44132', 'Euclid', 'Cuyahoga', 41.6049, -81.4924),
('44133', 'North Royalton', 'Cuyahoga', 41.3144, -81.7412),
('44134', 'Parma', 'Cuyahoga', 41.3711, -81.7172),
('44135', 'Cleveland', 'Cuyahoga', 41.4284, -81.8204),
('44136', 'Strongsville', 'Cuyahoga', 41.3144, -81.8364),
('44137', 'Maple Heights', 'Cuyahoga', 41.4078, -81.5564),
('44138', 'Olmsted Falls', 'Cuyahoga', 41.3678, -81.9085),
('44139', 'Solon', 'Cuyahoga', 41.3878, -81.4444),
('44140', 'Bay Village', 'Cuyahoga', 41.4867, -81.9245),
('44141', 'Brecksville', 'Cuyahoga', 41.3144, -81.6233),
('44142', 'Brookpark', 'Cuyahoga', 41.3978, -81.8204),
('44143', 'Richmond Heights', 'Cuyahoga', 41.5534, -81.4924),
('44144', 'Cleveland', 'Cuyahoga', 41.4378, -81.7332),
('44145', 'Westlake', 'Cuyahoga', 41.4545, -81.9405),
('44146', 'Bedford', 'Cuyahoga', 41.3878, -81.5244),
('44147', 'Broadview Heights', 'Cuyahoga', 41.3344, -81.6793),
('44149', 'Strongsville', 'Cuyahoga', 41.2877, -81.8364);
