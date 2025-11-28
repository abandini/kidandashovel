# A Kid and a Shovel

A hyperlocal marketplace connecting Northeast Ohio seniors and homeowners with verified teenage workers for snow removal services.

## Features

- **For Homeowners**: Browse verified teen workers, post jobs, pay with cash or card
- **For Teen Workers**: Create profiles, set availability, earn money, learn financial literacy
- **Safety**: Parental consent required, before/after photos, two-way ratings
- **Weather Alerts**: Automatic notifications when snow is forecast
- **Financial Literacy**: Track earnings, set savings goals, learn about compound interest

## Tech Stack

- **Cloudflare Workers** - Main application runtime
- **D1** - SQLite database for users, jobs, ratings
- **R2** - Photo storage (before/after job photos, profile pictures)
- **KV** - Session management and caching
- **Workers AI** - Image moderation
- **Durable Objects** - Rate limiting for notifications
- **Hono** - Web framework

## Getting Started

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/akidandashovel.git
cd akidandashovel
```

2. Install dependencies:
```bash
npm install
```

3. Create D1 database:
```bash
wrangler d1 create akidandashovel-db
```

4. Create R2 bucket:
```bash
wrangler r2 bucket create akidandashovel-photos
```

5. Create KV namespaces:
```bash
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
```

6. Update `wrangler.toml` with your resource IDs

7. Run database migrations:
```bash
npm run db:migrate:local
```

8. Start development server:
```bash
npm run dev
```

### Environment Variables

Create a `.dev.vars` file with:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@akidandashovel.com
SESSION_SECRET=...
```

## Project Structure

```
src/
├── index.ts              # Main entry point
├── types/                # TypeScript type definitions
├── routes/
│   ├── api/              # API endpoints
│   └── pages/            # HTML page routes
├── middleware/           # Auth and validation middleware
├── services/             # Business logic services
├── db/queries/           # Database query functions
├── durable-objects/      # Durable Object classes
├── templates/            # HTML templates
└── utils/                # Utility functions
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List available jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/claim` - Claim a job
- `POST /api/jobs/:id/complete` - Mark job complete

### Workers
- `GET /api/workers` - List available workers
- `GET /api/workers/:id` - Get worker profile
- `PATCH /api/workers/me/profile` - Update profile

### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/job/:id` - Get job ratings

## Deployment

```bash
npm run deploy
```

## License

MIT
