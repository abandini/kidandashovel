import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types';

// Import route handlers
import { authRoutes } from './routes/api/auth';
import { jobsRoutes } from './routes/api/jobs';
import { workersRoutes } from './routes/api/workers';
import { ratingsRoutes } from './routes/api/ratings';
import { photosRoutes } from './routes/api/photos';

// Import page routes
import { pageRoutes } from './routes/pages';

// Import Durable Object
export { NotificationRateLimiter } from './durable-objects/rate-limiter';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin, // Allow same-origin in production
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/jobs', jobsRoutes);
app.route('/api/workers', workersRoutes);
app.route('/api/ratings', ratingsRoutes);
app.route('/api/photos', photosRoutes);

// Page Routes (server-rendered HTML)
app.route('/', pageRoutes);

// 404 handler
app.notFound((c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }
  // Return HTML 404 page
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found - A Kid and a Shovel</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
    h1 { color: #333; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Page Not Found</h1>
  <p>The page you're looking for doesn't exist.</p>
  <a href="/">Go back home</a>
</body>
</html>`,
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json(
      {
        success: false,
        error: c.env.ENVIRONMENT === 'production' ? 'Internal server error' : err.message,
      },
      500
    );
  }
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - A Kid and a Shovel</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
    h1 { color: #dc2626; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Something went wrong</h1>
  <p>We're sorry, an error occurred. Please try again.</p>
  <a href="/">Go back home</a>
</body>
</html>`,
    500
  );
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Scheduled handler for cron triggers (weather checks)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`Cron triggered at ${event.scheduledTime}`);

    // Weather check logic will be implemented in Phase 2
    // For now, just log the trigger
    try {
      // TODO: Import and call weatherService.checkForecast(env)
      console.log('Weather check scheduled - implementation pending');
    } catch (error) {
      console.error('Scheduled weather check failed:', error);
    }
  },
};
