# Claude Code Prompt: A Kid and a Shovel

## Project Overview

Build "A Kid and a Shovel" (akidandashovel.com) — a hyperlocal marketplace connecting Northeast Ohio seniors and homeowners with verified teenage workers for snow removal services. Think Uber meets neighborhood kid economy, with built-in financial literacy hooks.

## Core Concept

- **Homeowners** (primarily seniors) can browse available teen workers OR post jobs for teens to claim
- **Teen workers** (13-17) create profiles, list services, set availability, take before/after photos, build reputation
- Both parties rate each other after completed jobs
- Supports cash payments and Stripe for card payments (with small platform fee)

---

## Technical Stack (Cloudflare-First)

- **Cloudflare Workers** — main application (NOT Pages)
- **D1** — relational database for users, jobs, ratings, verifications
- **R2** — photo storage (before/after job photos, profile pictures)
- **KV** — session management, caching, feature flags
- **Secrets** — API keys (Stripe, any verification services)
- **Workers AI** — image moderation, potentially matching optimization, chat support
- **Durable Objects** — weather check scheduling, notification rate limiting
- **Deployment** — GitHub repo as single source of truth, deploy via GitHub Actions or Wrangler

---

## User Types

### Homeowners (Hiring)
- Registration: name, address (must be NEO), phone, email
- Can browse verified teen workers by proximity, rating, services offered
- Can post jobs (address, service needed, timing — ASAP or scheduled, price willing to pay or "make offer")
- Pay via cash or Stripe
- Rate workers after job completion (only if job actually happened)
- Get rated by workers (payment promptness, accuracy of job description, treatment)

### Teen Workers
- Registration: name, age (13-17), parent/guardian consent (required), school enrollment verification, address
- Profile: photo, bio, services offered (driveway, walkway, car brushing), equipment they have, availability zones (how far they'll travel)
- References: can add references at signup, but primary reputation comes from job ratings
- Job flow: browse available jobs, claim them, or get hired directly from profile
- Before/after photos required for job completion
- Receive payment (cash or Stripe Connect to parent-linked account)
- Rate homeowners after job

### Parent/Guardian
- Must approve teen's registration
- Linked to teen's Stripe Connect for receiving payments
- Can view teen's job history, earnings, ratings

---

## Core Features — MVP

### Discovery & Matching
- Homeowners see map/list of available workers within X miles
- Workers see map/list of posted jobs within their travel radius
- Filter by: service type, rating, availability, price range
- Geolocation for proximity calculations (store lat/lng, calculate distance)

### Job Lifecycle
1. **Posted** — homeowner creates job
2. **Claimed** — teen claims job (or homeowner directly hires from profile)
3. **Confirmed** — both parties confirm (time, price, address)
4. **In Progress** — teen marks started, takes "before" photo
5. **Completed** — teen marks done, takes "after" photo, submits
6. **Reviewed** — homeowner confirms completion, pays (if Stripe), both rate each other
7. **Disputed** — edge case handling

### Rating System
- 1-5 stars + optional text
- Workers rated on: quality, reliability, politeness, communication
- Homeowners rated on: payment promptness, accuracy of job scope, treatment of worker
- Only users who completed actual transactions can rate (prevents gaming)
- Display average rating and number of completed jobs

### Verification System (Teen Workers)
- Parental consent (checkbox + parent email confirmation for MVP, could add DocuSign later)
- School enrollment (self-reported school name for MVP, could integrate verification later)
- References (optional additional names/contacts at signup)
- Profile photo (run through Workers AI for basic moderation)
- Verified badge after all checks complete

### Photo System
- Before/after photos required for job completion
- Stored in R2, linked to job record in D1
- Run through Workers AI for moderation (no inappropriate content)
- Displayed in job history, can be referenced in disputes

### Payments
- **Cash**: homeowner and teen handle directly, teen marks "paid in cash" to complete job
- **Stripe Connect**: 
  - Platform takes 10% (7% operations, 3% to teen's "future fund" — display this transparently)
  - Teen worker accounts connected to parent/guardian bank account
  - Homeowner pays via saved card or one-time payment
  - Handle Stripe webhooks for payment confirmation

---

## Phase 2: Weather Integration

### Overview
Proactive notifications when snow is forecast — alert homeowners to post jobs, alert workers to mark themselves available.

### Weather API: National Weather Service (Free)
- **Endpoint**: `https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast`
- **For NEO**: Office is `CLE` (Cleveland)
- No API key required, just need to set a User-Agent header
- Returns 7-day forecast with precipitation amounts

### Implementation

```typescript
// Scheduled Worker (runs hourly via Cron Trigger)
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const forecast = await fetch(
      'https://api.weather.gov/gridpoints/CLE/82,64/forecast',
      { headers: { 'User-Agent': 'AKidAndAShovel/1.0 (contact@akidandashovel.com)' } }
    );
    const data = await forecast.json();
    
    // Parse periods for snow predictions
    for (const period of data.properties.periods) {
      if (period.shortForecast.toLowerCase().includes('snow')) {
        // Extract expected accumulation from detailedForecast
        const inches = parseSnowfall(period.detailedForecast);
        if (inches >= 2) {
          await triggerSnowAlerts(env, period, inches);
        }
      }
    }
  }
}
```

### Cron Trigger Configuration (wrangler.toml)
```toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

### Alert Thresholds
- **2+ inches**: "Light snow expected — good opportunity for quick jobs"
- **4+ inches**: "Moderate snow coming — consider posting a job now"
- **6+ inches**: "Heavy snow forecast — book a worker before they fill up"

### Durable Object for Rate Limiting
Prevent notification spam — don't send more than one snow alert per 12-hour period per user.

```typescript
export class NotificationRateLimiter {
  async canNotify(userId: string, type: string): Promise<boolean> {
    const key = `${userId}:${type}`;
    const lastSent = await this.state.storage.get(key);
    if (lastSent && Date.now() - lastSent < 12 * 60 * 60 * 1000) {
      return false;
    }
    await this.state.storage.put(key, Date.now());
    return true;
  }
}
```

---

## Phase 2: Push Notification Infrastructure

### Overview
Web Push notifications for both homeowners and teen workers, with PWA support for teens.

### Technology Stack
- **Web Push API** — standard browser push
- **VAPID keys** — for authentication with push services
- **D1** — store push subscriptions
- **Service Worker** — handle incoming pushes in PWA

### Database Schema Addition

```sql
-- Push subscriptions
push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,      -- Public key
  auth TEXT NOT NULL,         -- Auth secret
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Environment Variables (Secrets)

```
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:contact@akidandashovel.com
```

### Generate VAPID Keys (one-time setup)

```bash
npx web-push generate-vapid-keys
```

### Subscription Flow

```typescript
// Client-side (in PWA)
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Send subscription to our API
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
```

### Sending Push Notifications (Worker)

```typescript
import webpush from 'web-push';  // Use cf-webpush for Workers compatibility

async function sendPushNotification(env: Env, userId: string, payload: object) {
  // Get user's subscriptions from D1
  const subs = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
  ).bind(userId).all();
  
  for (const sub of subs.results) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: env.VAPID_SUBJECT,
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY
          }
        }
      );
      
      // Update last_used_at
      await env.DB.prepare(
        'UPDATE push_subscriptions SET last_used_at = ? WHERE endpoint = ?'
      ).bind(new Date().toISOString(), sub.endpoint).run();
      
    } catch (err) {
      if (err.statusCode === 410) {
        // Subscription expired, remove it
        await env.DB.prepare(
          'DELETE FROM push_subscriptions WHERE endpoint = ?'
        ).bind(sub.endpoint).run();
      }
    }
  }
}
```

### Service Worker (PWA)

```typescript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
```

### Notification Types

**For Homeowners:**
- Snow forecast alert: "2-4 inches of snow expected tomorrow. Post a job now?"
- Job claimed: "Alex has claimed your snow removal job"
- Job completed: "Your driveway has been cleared! Review Alex's work"
- Worker message: "Alex: On my way, be there in 10 minutes"

**For Teen Workers:**
- New job nearby: "New job posted 0.3 miles away — $25 driveway clearing"
- Job confirmed: "Mrs. Johnson confirmed your job for tomorrow at 9am"
- Payment received: "$25 received for driveway clearing (Stripe)"
- Snow forecast: "4+ inches coming Saturday — mark yourself available?"

### Permission Request UX
- Don't ask immediately on signup — wait until contextually relevant
- For teens: Ask after first job is confirmed ("Get notified when new jobs are posted?")
- For homeowners: Ask after first job is posted ("Get notified when someone claims your job?")

---

## Phase 3: Financial Literacy Features

### Overview
Transform the app from just a job platform into a financial education tool. Show teens the power of saving and investing their earnings.

### Earnings Dashboard (Built-in)

```typescript
interface EarningsSummary {
  totalEarned: number;           // All-time earnings
  thisMonth: number;
  thisWeek: number;
  jobsCompleted: number;
  averagePerJob: number;
  futureFundBalance: number;     // The 3% we hold
  futureFundProjected: number;   // If invested at 7% for 10 years
}
```

### Database Schema Addition

```sql
-- Savings goals
savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,           -- "New iPhone", "Car fund", "College"
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

-- Earnings history (for charts/tracking)
earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  amount REAL NOT NULL,
  platform_fee REAL NOT NULL,   -- 7%
  future_fund REAL NOT NULL,    -- 3%
  net_amount REAL NOT NULL,     -- What they received
  payment_method TEXT NOT NULL, -- 'cash' or 'stripe'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
)
```

### Built-in Educational Features

**Compound Interest Calculator**
```typescript
function projectGrowth(principal: number, years: number, rate: number = 0.07): number {
  return principal * Math.pow(1 + rate, years);
}

// Show teens: "Your $150 in the Future Fund could be $295 by the time you're 25!"
```

**Earnings Visualization**
- Weekly/monthly earnings chart
- Progress toward savings goals
- "What if" projections: "If you did 2 more jobs per week..."

**Financial Tips (contextual)**
- After first $100 earned: "Nice! Did you know if you save half of this..."
- After 10 jobs: "You're building a track record. This is how credit scores work too..."
- End of season: "You earned $X this winter. Here's what you could do with it..."

### Partner Integrations (Phase 3)

**Greenlight (Teen Debit Card + Investing)**
- API: https://developer.greenlight.com/
- Integration: Direct deposit teen earnings to Greenlight account
- Features: Parent controls, savings goals, stock investing for kids
- Revenue model: Referral fees

**Fidelity Youth Account**
- For teens 13-17, owned by the teen
- No minimum, no fees
- Could facilitate direct transfer of "Future Fund" balance
- Integration: Likely manual/educational initially (link to sign up)

**EverFi (Financial Literacy Content)**
- Free financial education modules
- Embed relevant lessons: "Before you cash out, take this 5-minute module on saving"
- Partner for credibility

**Acorns Early (Invest for Kids)**
- Parent-owned custodial account
- Round-up investing
- Educational content built in

### Implementation Approach

**Phase 3a: Built-in Features**
- Earnings dashboard with charts
- Savings goals tracker
- Compound interest calculator
- Educational content (written in-house)

**Phase 3b: Partner Exploration**
- Reach out to Greenlight, Fidelity for partnership discussions
- Integrate one partner deeply rather than many shallowly
- Consider: who aligns best with "neighborhood kid earning money" brand?

**Phase 3c: Future Fund Formalization**
- Currently just a number we track
- Could become actual custodial investment account
- Legal/compliance considerations for handling minors' money
- Might need to partner with registered investment advisor

### UI for Financial Features

**Teen Dashboard Additions:**
```
┌─────────────────────────────────────┐
│  Your Earnings                      │
│  ─────────────────────────────────  │
│  This Week: $75                     │
│  This Month: $225                   │
│  All-Time: $1,450                   │
│                                     │
│  [Chart: Weekly earnings]           │
│                                     │
│  ─────────────────────────────────  │
│  Future Fund: $43.50                │
│  If invested until age 25: ~$156    │
│  [Learn more about investing →]     │
│                                     │
│  ─────────────────────────────────  │
│  Your Goals                         │
│  🚗 Car Fund: $400 / $2,000 ████░░  │
│  📱 New Phone: $150 / $800  ██░░░░  │
│  [+ Add Goal]                       │
└─────────────────────────────────────┘
```

---

## Complete Database Schema (D1)

```sql
-- Users table (all types)
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

-- Teen profiles (extends users)
CREATE TABLE teen_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  parent_user_id TEXT,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 17),
  school_name TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  services TEXT DEFAULT '[]',          -- JSON array: ["driveway", "walkway", "car_brushing"]
  equipment TEXT DEFAULT '[]',          -- JSON array: ["shovel", "snow_blower", "salt"]
  travel_radius_miles REAL DEFAULT 2.0,
  available_now INTEGER DEFAULT 0,      -- Boolean: 1 = available
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  avg_rating REAL DEFAULT 0,
  completed_jobs_count INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  future_fund_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_user_id) REFERENCES users(id)
);

-- Homeowner profiles
CREATE TABLE homeowner_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  property_type TEXT DEFAULT 'house',   -- house, condo, apartment
  driveway_size TEXT,                   -- small, medium, large
  special_instructions TEXT,
  avg_rating REAL DEFAULT 0,
  jobs_posted_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Parent consents
CREATE TABLE parent_consents (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  parent_user_id TEXT,
  parent_email TEXT NOT NULL,
  consent_token TEXT UNIQUE NOT NULL,
  consent_given INTEGER DEFAULT 0,
  consent_given_at TEXT,
  consent_method TEXT,                  -- 'email_link', 'in_app', 'docusign'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teen_user_id) REFERENCES users(id),
  FOREIGN KEY (parent_user_id) REFERENCES users(id)
);

-- Teen references
CREATE TABLE teen_references (
  id TEXT PRIMARY KEY,
  teen_user_id TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_contact TEXT,               -- phone or email
  reference_relationship TEXT,          -- neighbor, teacher, coach, etc.
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teen_user_id) REFERENCES users(id)
);

-- Jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  homeowner_id TEXT NOT NULL,
  worker_id TEXT,
  status TEXT DEFAULT 'posted' CHECK (status IN ('posted', 'claimed', 'confirmed', 'in_progress', 'completed', 'reviewed', 'cancelled', 'disputed')),
  service_type TEXT NOT NULL,           -- driveway, walkway, car_brushing, combo
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  description TEXT,
  price_offered REAL,
  price_accepted REAL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'stripe')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  scheduled_for TEXT,                   -- NULL = ASAP
  claimed_at TEXT,
  confirmed_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  reviewed_at TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES users(id),
  FOREIGN KEY (worker_id) REFERENCES users(id)
);

-- Ratings
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  rater_id TEXT NOT NULL,
  rated_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  rating_categories TEXT,               -- JSON: {"quality": 5, "punctuality": 4, "communication": 5}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (rater_id) REFERENCES users(id),
  FOREIGN KEY (rated_id) REFERENCES users(id)
);

-- Push subscriptions
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Savings goals
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
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Weather alerts log
CREATE TABLE weather_alerts (
  id TEXT PRIMARY KEY,
  forecast_date TEXT NOT NULL,
  snow_inches_min REAL,
  snow_inches_max REAL,
  alert_type TEXT,                      -- light, moderate, heavy
  notifications_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_zip ON users(zip);
CREATE INDEX idx_teen_profiles_user ON teen_profiles(user_id);
CREATE INDEX idx_teen_profiles_available ON teen_profiles(available_now);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_homeowner ON jobs(homeowner_id);
CREATE INDEX idx_jobs_worker ON jobs(worker_id);
CREATE INDEX idx_jobs_location ON jobs(lat, lng);
CREATE INDEX idx_ratings_rated ON ratings(rated_id);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);
CREATE INDEX idx_earnings_user ON earnings(user_id);
```

---

## Pages / Routes

### Public
- `/` — landing page, explain concept, CTA to sign up
- `/login` — login for all user types
- `/signup/homeowner` — homeowner registration
- `/signup/teen` — teen registration (triggers parent consent flow)
- `/signup/parent` — parent registration (if coming from teen invite)
- `/about` — about the platform, trust/safety info
- `/faq` — frequently asked questions

### Homeowner (authenticated)
- `/dashboard` — overview, active jobs, past jobs
- `/workers` — browse available workers, filter/sort
- `/workers/[id]` — worker profile, hire directly
- `/jobs/new` — post a new job
- `/jobs/[id]` — job detail, status, photos, complete/rate
- `/settings` — profile, payment methods, notification preferences

### Teen Worker (authenticated)
- `/worker/dashboard` — earnings, active jobs, availability toggle
- `/worker/jobs` — browse available jobs to claim
- `/worker/jobs/[id]` — job detail, claim, start, complete with photos
- `/worker/profile` — edit profile, services, equipment
- `/worker/earnings` — payment history, charts, "future fund" balance
- `/worker/goals` — savings goals tracker
- `/worker/learn` — financial literacy content
- `/worker/settings` — settings, linked parent account

### Parent (authenticated)
- `/parent/dashboard` — linked teen(s), their earnings, job history
- `/parent/consent/[token]` — consent approval page (from email link)
- `/parent/settings` — payment account for receiving teen earnings

### API Routes
- `/api/auth/*` — login, logout, register, password reset
- `/api/jobs/*` — CRUD for jobs
- `/api/workers/*` — worker listings, profiles
- `/api/ratings/*` — submit/retrieve ratings
- `/api/photos/upload` — R2 upload endpoint
- `/api/push/subscribe` — save push subscription
- `/api/push/unsubscribe` — remove push subscription
- `/api/stripe/webhook` — Stripe webhook handler
- `/api/weather/check` — manual weather check (cron does this automatically)

---

## PWA Configuration

### manifest.json
```json
{
  "name": "A Kid and a Shovel",
  "short_name": "Shovel",
  "description": "Connect with local teens for snow removal",
  "start_url": "/worker/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Environment Variables / Secrets

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@akidandashovel.com

# Session
SESSION_SECRET=...

# Optional: Image moderation
CLOUDFLARE_AI_GATEWAY_ID=...
```

---

## wrangler.toml

```toml
name = "akidandashovel"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 * * * *"]  # Hourly weather check

[[d1_databases]]
binding = "DB"
database_name = "akidandashovel-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "akidandashovel-photos"

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id"

[ai]
binding = "AI"

# Durable Objects for rate limiting
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "NotificationRateLimiter"

[[migrations]]
tag = "v1"
new_classes = ["NotificationRateLimiter"]

[vars]
ENVIRONMENT = "production"
```

---

## Repository Structure

```
akidandashovel/
├── src/
│   ├── index.ts                 # Worker entry point, router
│   ├── routes/
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── jobs.ts
│   │   │   ├── workers.ts
│   │   │   ├── ratings.ts
│   │   │   ├── photos.ts
│   │   │   ├── push.ts
│   │   │   └── stripe-webhook.ts
│   │   ├── pages/
│   │   │   ├── home.ts
│   │   │   ├── dashboard.ts
│   │   │   └── ...
│   │   └── worker-pwa/
│   │       ├── dashboard.ts
│   │       ├── jobs.ts
│   │       └── ...
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── rate-limit.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── jobs.service.ts
│   │   ├── ratings.service.ts
│   │   ├── photos.service.ts
│   │   ├── push.service.ts
│   │   ├── stripe.service.ts
│   │   ├── weather.service.ts
│   │   └── ai-moderation.service.ts
│   ├── db/
│   │   ├── queries/
│   │   │   ├── users.ts
│   │   │   ├── jobs.ts
│   │   │   └── ...
│   │   └── migrations/
│   │       └── 0001_initial.sql
│   ├── durable-objects/
│   │   └── rate-limiter.ts
│   ├── utils/
│   │   ├── geo.ts              # Distance calculations
│   │   ├── validation.ts
│   │   └── helpers.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── css/
│   ├── js/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js                   # Service worker
├── migrations/
│   └── 0001_initial.sql
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Phases

### Phase 1 — MVP (Weeks 1-4)
- [ ] Project setup (repo, wrangler, D1, R2, KV)
- [ ] Database migrations
- [ ] User registration (all types) with email verification
- [ ] Parent consent flow (email link)
- [ ] Teen worker profiles (services, equipment, travel radius)
- [ ] Job posting by homeowners
- [ ] Job browsing and claiming by workers
- [ ] Job lifecycle (claim → confirm → start → complete)
- [ ] Before/after photo upload to R2
- [ ] Basic rating system (both directions)
- [ ] Cash payment marking
- [ ] NEO geographic restriction (ZIP code validation)
- [ ] Basic responsive UI (mobile-first)

### Phase 2 — Payments & Notifications (Weeks 5-8)
- [ ] Stripe Connect integration (teen → parent account)
- [ ] Stripe payment flow for homeowners
- [ ] Platform fee handling (7% + 3% future fund)
- [ ] Push notification infrastructure
- [ ] Service worker for PWA
- [ ] Weather API integration
- [ ] Snow forecast alerts
- [ ] Job notification alerts
- [ ] Durable Object rate limiting

### Phase 3 — Financial Literacy & Polish (Weeks 9-12)
- [ ] Earnings dashboard with charts
- [ ] Savings goals feature
- [ ] Compound interest calculator
- [ ] Educational content
- [ ] Workers AI image moderation
- [ ] Enhanced verification options
- [ ] Performance optimization
- [ ] Security audit
- [ ] Partner outreach (Greenlight, Fidelity, etc.)

### Phase 4 — Growth (Future)
- [ ] Expand geography beyond NEO
- [ ] Add services (lawn, leaves, car washing)
- [ ] Recurring job scheduling
- [ ] In-app messaging
- [ ] Partner integrations
- [ ] Native mobile apps (if needed)

---

## Quality & Testing

- Follow QA protocol before declaring any feature complete
- Test on actual mobile devices (not just responsive dev tools)
- Test senior-friendly UX with actual seniors if possible
- Test with actual teens for worker flows
- Handle edge cases:
  - Job cancellation (by either party)
  - No-shows
  - Disputes
  - Payment failures
  - Network issues during photo upload
- Load testing for snow day spikes
- Security testing (auth, input validation, SQL injection)

---

## Launch Checklist

- [ ] Domain configured (akidandashovel.com → Cloudflare)
- [ ] SSL certificate active
- [ ] Stripe account verified and connected
- [ ] VAPID keys generated and stored
- [ ] Database seeded with NEO ZIP codes
- [ ] Weather cron job tested
- [ ] Error monitoring set up
- [ ] Analytics configured
- [ ] Terms of Service written
- [ ] Privacy Policy written
- [ ] Parent consent language reviewed
- [ ] Social media accounts created
- [ ] Launch announcement prepared

---

## Notes for Claude Code

1. **Start with infrastructure**: Set up wrangler.toml, create D1 database, R2 bucket, and KV namespaces first.

2. **Database migrations**: Run the full schema migration before writing any application code.

3. **Authentication first**: Build the auth system (registration, login, sessions) before protected routes.

4. **Mobile-first CSS**: Use Tailwind or similar, but ensure large tap targets and readable fonts for seniors.

5. **Test the parent consent flow thoroughly**: This is critical for legal compliance.

6. **Photo uploads**: Use direct-to-R2 uploads with signed URLs to avoid Worker memory limits.

7. **Geolocation**: Store lat/lng at registration, use Haversine formula for distance calculations.

8. **Don't over-engineer**: MVP first, then iterate. Get real users before adding complexity.

---

**Ready to build. Start with Phase 1, starting with the repository structure and database setup.**
