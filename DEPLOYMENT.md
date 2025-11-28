# Deployment Guide for A Kid and a Shovel

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Stripe account for payments
- Domain name (optional, but recommended)

## Quick Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. Create Cloudflare Resources

Run the setup script:

```bash
./scripts/setup.sh
```

Or manually create resources:

```bash
# Create D1 database
wrangler d1 create akidandashovel-db

# Create R2 bucket
wrangler r2 bucket create akidandashovel-photos

# Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
```

### 3. Update wrangler.toml

Replace the placeholder IDs in `wrangler.toml` with the actual IDs from the previous step:

```toml
[[d1_databases]]
binding = "DB"
database_name = "akidandashovel-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_ACTUAL_SESSIONS_KV_ID"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_ACTUAL_CACHE_KV_ID"
```

### 4. Generate VAPID Keys

For push notifications:

```bash
npx web-push generate-vapid-keys
```

Save the output - you'll need both keys.

### 5. Set Secrets

```bash
# Stripe (get from https://dashboard.stripe.com/apikeys)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PUBLISHABLE_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_CONNECT_CLIENT_ID

# Push notifications
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT  # Use: mailto:contact@yourdomain.com

# Session
wrangler secret put SESSION_SECRET  # Generate random 64-char string
```

### 6. Run Database Migration

```bash
# For production
npm run db:migrate

# For local development
npm run db:migrate:local
```

### 7. Deploy

```bash
npm run deploy
```

## GitHub Actions Deployment

For automatic deployment on push to main:

1. Go to your GitHub repo Settings > Secrets
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN` - Create at https://dash.cloudflare.com/profile/api-tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Found in your Cloudflare dashboard

The workflow in `.github/workflows/deploy.yml` will deploy on every push to main.

## Domain Setup

1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your worker
3. Go to Triggers > Custom Domains
4. Add your domain (e.g., akidandashovel.com)

## Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `transfer.failed`
   - `account.updated`
4. Copy the webhook signing secret and set it with:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

## Environment Variables

For local development, create `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your test credentials
```

## Monitoring

- View logs: `wrangler tail`
- D1 dashboard: Cloudflare Dashboard > D1
- R2 dashboard: Cloudflare Dashboard > R2

## Troubleshooting

### Database errors
```bash
# Check D1 status
wrangler d1 info akidandashovel-db

# Re-run migrations
wrangler d1 execute akidandashovel-db --file=./migrations/0001_initial.sql
```

### Worker errors
```bash
# View real-time logs
wrangler tail

# Check deployment status
wrangler deployments list
```

### Session issues
Make sure SESSION_SECRET is set and KV namespace is properly configured.
