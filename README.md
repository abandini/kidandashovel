# A Kid and a Shovel

A hyperlocal marketplace connecting Northeast Ohio seniors and homeowners with verified teenage workers for snow removal services.

## Overview

"A Kid and a Shovel" brings together homeowners who need snow removal with responsible teens looking to earn money. The platform includes:

- **For Homeowners**: Browse verified teen workers, post jobs, pay securely
- **For Teen Workers**: Find jobs nearby, build reputation, learn financial literacy
- **For Parents**: Approve teen registration, manage payments, track earnings

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (photos)
- **Cache**: Cloudflare KV
- **AI**: Cloudflare Workers AI (image moderation)
- **Payments**: Stripe Connect
- **Framework**: Hono

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/abandini/kidandashovel.git
   cd kidandshovel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create Cloudflare resources:
   ```bash
   # Create D1 database
   wrangler d1 create akidandashovel-db

   # Create R2 bucket
   wrangler r2 bucket create akidandashovel-photos

   # Create KV namespaces
   wrangler kv:namespace create SESSIONS
   wrangler kv:namespace create CACHE
   ```

4. Update `wrangler.toml` with your resource IDs

5. Copy and configure secrets:
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your API keys
   ```

6. Run database migrations:
   ```bash
   npm run db:local
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── src/
│   ├── index.ts              # Entry point
│   ├── types/                # TypeScript types
│   ├── routes/
│   │   ├── api/              # API endpoints
│   │   └── pages/            # Server-rendered pages
│   ├── middleware/           # Auth, validation
│   ├── services/             # Business logic
│   ├── db/queries/           # Database queries
│   ├── durable-objects/      # Rate limiting
│   └── utils/                # Helpers
├── migrations/               # D1 migrations
├── public/                   # Static assets
├── feature-list.json         # Feature tracking
└── claude-progress.txt       # Development progress
```

## Scripts

- `npm run dev` - Start local dev server
- `npm run deploy` - Deploy to production
- `npm run db:local` - Apply migrations locally
- `npm run db:remote` - Apply migrations to production
- `npm run typecheck` - Run TypeScript type check
- `npm run tail` - View production logs

## Development Phases

1. **MVP**: User registration, job posting, before/after photos, ratings, cash payments
2. **Payments**: Stripe integration, push notifications, weather alerts
3. **Financial Literacy**: Earnings dashboard, savings goals, educational content

## License

Private - All rights reserved
