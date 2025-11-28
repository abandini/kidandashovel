#!/bin/bash
# Deployment setup script for A Kid and a Shovel

set -e

echo "=== A Kid and a Shovel - Deployment Setup ==="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "Checking Cloudflare authentication..."
wrangler whoami || {
    echo "Please login to Cloudflare first: wrangler login"
    exit 1
}

echo ""
echo "=== Step 1: Create D1 Database ==="
echo "Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create akidandashovel-db 2>&1) || true
echo "$DB_OUTPUT"

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')
if [ -n "$DB_ID" ]; then
    echo "Database ID: $DB_ID"
    echo ""
    echo "Update wrangler.toml with: database_id = \"$DB_ID\""
fi

echo ""
echo "=== Step 2: Create R2 Bucket ==="
echo "Creating R2 bucket..."
wrangler r2 bucket create akidandashovel-photos 2>&1 || echo "Bucket may already exist"

echo ""
echo "=== Step 3: Create KV Namespaces ==="
echo "Creating sessions KV..."
SESSIONS_OUTPUT=$(wrangler kv:namespace create SESSIONS 2>&1) || true
echo "$SESSIONS_OUTPUT"

echo ""
echo "Creating cache KV..."
CACHE_OUTPUT=$(wrangler kv:namespace create CACHE 2>&1) || true
echo "$CACHE_OUTPUT"

echo ""
echo "=== Step 4: Set Secrets ==="
echo "You need to set the following secrets:"
echo ""
echo "  wrangler secret put STRIPE_SECRET_KEY"
echo "  wrangler secret put STRIPE_PUBLISHABLE_KEY"
echo "  wrangler secret put STRIPE_WEBHOOK_SECRET"
echo "  wrangler secret put STRIPE_CONNECT_CLIENT_ID"
echo "  wrangler secret put VAPID_PUBLIC_KEY"
echo "  wrangler secret put VAPID_PRIVATE_KEY"
echo "  wrangler secret put VAPID_SUBJECT"
echo "  wrangler secret put SESSION_SECRET"
echo ""

echo "=== Step 5: Generate VAPID Keys ==="
echo "Run this command to generate VAPID keys:"
echo "  npx web-push generate-vapid-keys"
echo ""

echo "=== Step 6: Run Database Migration ==="
echo "After updating wrangler.toml with the correct IDs, run:"
echo "  npm run db:migrate"
echo ""

echo "=== Step 7: Deploy ==="
echo "Deploy with:"
echo "  npm run deploy"
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Don't forget to:"
echo "1. Update wrangler.toml with the resource IDs printed above"
echo "2. Set all required secrets"
echo "3. Run the database migration"
echo "4. Configure your domain in Cloudflare dashboard"
