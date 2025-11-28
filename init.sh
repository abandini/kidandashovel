#!/bin/bash

# =============================================================================
# A Kid and a Shovel - Project Initialization Script
# =============================================================================
# Run at the start of every session: ./init.sh
# =============================================================================

set -e  # Exit on any error

echo "=========================================="
echo "  A Kid and a Shovel - Environment Init"
echo "=========================================="
echo ""

# -----------------------------------------------------------------------------
# 1. ENVIRONMENT CHECKS
# -----------------------------------------------------------------------------

echo "[1/6] Checking required tools..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi
echo "  Node.js: $(node --version)"

# npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed"
    exit 1
fi
echo "  npm: $(npm --version)"

# Wrangler for Cloudflare Workers
if ! command -v wrangler &> /dev/null; then
    echo "  WARNING: Wrangler not found globally, will use npx"
else
    echo "  Wrangler: $(wrangler --version 2>/dev/null | head -1)"
fi

# Git
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    exit 1
fi
echo "  Git: $(git --version | cut -d' ' -f3)"

echo "  All required tools present"
echo ""

# -----------------------------------------------------------------------------
# 2. DEPENDENCY INSTALLATION
# -----------------------------------------------------------------------------

echo "[2/6] Installing dependencies..."

if [ -f "package.json" ]; then
    echo "  Found package.json, installing npm dependencies..."
    npm install --silent 2>/dev/null || npm install
    echo "  npm dependencies installed"
else
    echo "  WARNING: No package.json found"
fi

echo ""

# -----------------------------------------------------------------------------
# 3. DATABASE SETUP
# -----------------------------------------------------------------------------

echo "[3/6] Setting up database..."

if [ -f "wrangler.toml" ]; then
    # Check if migrations directory exists
    if [ -d "migrations" ]; then
        echo "  Running D1 migrations (local)..."
        npx wrangler d1 migrations apply akidandashovel-db --local 2>/dev/null || echo "  (D1 migrations skipped - may need to create database first)"
    else
        echo "  No migrations directory found"
    fi
else
    echo "  No wrangler.toml found - skipping D1 setup"
fi

echo "  Database setup complete (or skipped)"
echo ""

# -----------------------------------------------------------------------------
# 4. ENVIRONMENT VARIABLES
# -----------------------------------------------------------------------------

echo "[4/6] Checking environment variables..."

if [ -f ".dev.vars" ]; then
    echo "  .dev.vars file found (local secrets)"
else
    echo "  WARNING: .dev.vars file missing for local development"
    if [ -f ".dev.vars.example" ]; then
        echo "    Copy from example: cp .dev.vars.example .dev.vars"
    fi
fi

echo "  Environment variables checked"
echo ""

# -----------------------------------------------------------------------------
# 5. TYPE CHECKING
# -----------------------------------------------------------------------------

echo "[5/6] Running type check..."

if [ -f "tsconfig.json" ]; then
    echo "  Running TypeScript type check..."
    npx tsc --noEmit 2>/dev/null && echo "  TypeScript: No errors" || echo "  TypeScript: Has errors (check output)"
else
    echo "  No tsconfig.json found - skipping type check"
fi

echo ""

# -----------------------------------------------------------------------------
# 6. HEALTH CHECK & STATUS REPORT
# -----------------------------------------------------------------------------

echo "[6/6] Running health checks..."

# Try to start dev server briefly to verify it works
if [ -f "wrangler.toml" ]; then
    echo "  Verifying wrangler config..."
    npx wrangler deploy --dry-run 2>/dev/null && echo "  Wrangler config: Valid" || echo "  Wrangler config: Has issues"
fi

echo "  Health checks complete"
echo ""

# -----------------------------------------------------------------------------
# STATUS REPORT
# -----------------------------------------------------------------------------

echo "=========================================="
echo "  Environment Ready"
echo "=========================================="
echo ""
echo "Git Status:"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'not a git repo')"
echo "  Last commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'no commits')"
echo ""

# Feature count from feature-list.json
if [ -f "feature-list.json" ]; then
    if command -v jq &> /dev/null; then
        TOTAL=$(jq '.stats.total' feature-list.json 2>/dev/null || echo "?")
        PASSING=$(jq '.stats.passing' feature-list.json 2>/dev/null || echo "?")
        PCT=$(jq '.stats.percentage' feature-list.json 2>/dev/null || echo "?")
        echo "Features: $PASSING / $TOTAL passing ($PCT%)"
    else
        echo "Features: (install jq for stats: brew install jq)"
    fi
fi

echo ""
echo "Quick Commands:"
echo "  npm run dev      - Start local dev server"
echo "  npm run deploy   - Deploy to Cloudflare"
echo "  npm run db:local - Apply D1 migrations locally"
echo ""
echo "Ready to work!"
echo "=========================================="
