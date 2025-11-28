// A Kid and a Shovel - Main Entry Point
// Hyperlocal marketplace for snow removal in Northeast Ohio

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types';

// Import API routes
import authRoutes from './routes/api/auth';
import jobsRoutes from './routes/api/jobs';
import workersRoutes from './routes/api/workers';
import ratingsRoutes from './routes/api/ratings';
import photosRoutes from './routes/api/photos';
import consentRoutes from './routes/api/consent';
import earningsRoutes from './routes/api/earnings';
import pushRoutes from './routes/api/push';
import stripeWebhook from './routes/api/stripe-webhook';
import stripeRoutes from './routes/api/stripe';

// Import page routes
import homePages from './routes/pages/home';
import dashboardPages from './routes/pages/dashboard';

// Import services
import { checkWeatherAndNotify, getCachedForecast } from './services/weather.service';

// Import Durable Objects
export { NotificationRateLimiter } from './durable-objects/rate-limiter';

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/jobs', jobsRoutes);
app.route('/api/workers', workersRoutes);
app.route('/api/ratings', ratingsRoutes);
app.route('/api/photos', photosRoutes);
app.route('/api/consent', consentRoutes);
app.route('/api/earnings', earningsRoutes);
app.route('/api/push', pushRoutes);
app.route('/api/stripe/webhook', stripeWebhook);
app.route('/api/stripe', stripeRoutes);

// Weather API
app.get('/api/weather/forecast', async (c) => {
  const forecast = await getCachedForecast(c.env);
  if (!forecast) {
    return c.json({ success: false, error: 'Failed to fetch forecast' }, 500);
  }
  return c.json({ success: true, data: forecast });
});

// Page routes
app.route('/', homePages);
app.route('/', dashboardPages);

// Static files - PWA manifest
app.get('/manifest.json', (c) => {
  return c.json({
    name: 'A Kid and a Shovel',
    short_name: 'Shovel',
    description: 'Connect with local teens for snow removal',
    start_url: '/worker/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
});

// Service Worker
app.get('/sw.js', (c) => {
  c.header('Content-Type', 'application/javascript');
  return c.body(`
// A Kid and a Shovel - Service Worker
const CACHE_NAME = 'akidandashovel-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'A Kid and a Shovel', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
  `);
});

// Serve photos from R2
app.get('/photos/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.PHOTOS.get(key);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
});

// Placeholder icon (in production, serve actual icons)
app.get('/icons/:name', (c) => {
  // Return a simple SVG placeholder
  const size = c.req.param('name').match(/icon-(\d+)/)?.[1] || '192';
  c.header('Content-Type', 'image/svg+xml');
  return c.body(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2563eb"/>
      <text x="50%" y="50%" font-size="${parseInt(size) / 4}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">❄️</text>
    </svg>
  `);
});

// Logout helper (client-side calls this)
app.get('/logout', async (c) => {
  // Clear session cookie and redirect
  c.header('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return c.redirect('/');
});

// 404 handler
app.notFound((c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }

  // Import layout inline to avoid circular deps
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found - A Kid and a Shovel</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem; }
        h1 { font-size: 4rem; margin-bottom: 1rem; }
        a { color: #2563eb; }
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>Page not found</p>
      <p><a href="/">Go back home</a></p>
    </body>
    </html>
  `, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - A Kid and a Shovel</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        a { color: #2563eb; }
      </style>
    </head>
    <body>
      <h1>Something went wrong</h1>
      <p>We're sorry, an error occurred. Please try again.</p>
      <p><a href="/">Go back home</a></p>
    </body>
    </html>
  `, 500);
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Scheduled handler for weather checks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(checkWeatherAndNotify(env));
  },
};
