// Push notification API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env, NotificationPayload } from '../../types';
import { generateId, now } from '../../utils/helpers';
import { authMiddleware, requireAuth, getCurrentUser } from '../../middleware/auth';

const push = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
push.use('*', authMiddleware());

// Get VAPID public key
push.get('/vapid-key', async (c) => {
  return c.json({
    success: true,
    data: {
      publicKey: c.env.VAPID_PUBLIC_KEY,
    },
  });
});

// Subscribe to push notifications
push.post('/subscribe', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { subscription, device_name } = await c.req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return c.json({ success: false, error: 'Invalid subscription data' }, 400);
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      return c.json({ success: false, error: 'Missing subscription keys' }, 400);
    }

    const id = generateId();
    const userAgent = c.req.header('User-Agent') || null;

    // Check if subscription already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).first();

    if (existing) {
      // Update existing subscription
      await c.env.DB.prepare(`
        UPDATE push_subscriptions
        SET user_id = ?, p256dh = ?, auth = ?, user_agent = ?,
            device_name = ?, is_active = 1, last_used_at = ?
        WHERE endpoint = ?
      `).bind(user!.id, p256dh, auth, userAgent, device_name || null, now(), endpoint).run();
    } else {
      // Create new subscription
      await c.env.DB.prepare(`
        INSERT INTO push_subscriptions (
          id, user_id, endpoint, p256dh, auth, user_agent, device_name, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).bind(id, user!.id, endpoint, p256dh, auth, userAgent, device_name || null, now()).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return c.json({ success: false, error: 'Failed to subscribe' }, 500);
  }
});

// Unsubscribe from push notifications
push.post('/unsubscribe', requireAuth(), async (c) => {
  try {
    const { endpoint } = await c.req.json();

    if (!endpoint) {
      return c.json({ success: false, error: 'Endpoint is required' }, 400);
    }

    await c.env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return c.json({ success: false, error: 'Failed to unsubscribe' }, 500);
  }
});

// Get notification history
push.get('/notifications', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { limit, offset, unread_only } = c.req.query();

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: (string | number)[] = [user!.id];

    if (unread_only === 'true') {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const results = await c.env.DB.prepare(query).bind(...params).all();

    // Get unread count
    const unreadCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL'
    ).bind(user!.id).first<{ count: number }>();

    return c.json({
      success: true,
      data: {
        notifications: results.results || [],
        unread_count: unreadCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ success: false, error: 'Failed to get notifications' }, 500);
  }
});

// Mark notification as read
push.post('/notifications/:id/read', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    await c.env.DB.prepare(`
      UPDATE notifications
      SET read_at = ?
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `).bind(now(), id, user!.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return c.json({ success: false, error: 'Failed to mark as read' }, 500);
  }
});

// Mark all notifications as read
push.post('/notifications/read-all', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);

    await c.env.DB.prepare(`
      UPDATE notifications
      SET read_at = ?
      WHERE user_id = ? AND read_at IS NULL
    `).bind(now(), user!.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return c.json({ success: false, error: 'Failed to mark all as read' }, 500);
  }
});

// Get subscription status
push.get('/status', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);

    const subscriptions = await c.env.DB.prepare(`
      SELECT id, device_name, user_agent, created_at, last_used_at
      FROM push_subscriptions
      WHERE user_id = ? AND is_active = 1
    `).bind(user!.id).all();

    return c.json({
      success: true,
      data: {
        subscribed: (subscriptions.results?.length || 0) > 0,
        subscriptions: subscriptions.results || [],
      },
    });
  } catch (error) {
    console.error('Get push status error:', error);
    return c.json({ success: false, error: 'Failed to get push status' }, 500);
  }
});

export default push;

// Helper function to send push notification (used by other services)
export async function sendPushNotification(
  env: Env,
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  // Get user's subscriptions
  const subscriptions = await env.DB.prepare(`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ? AND is_active = 1
  `).bind(userId).all();

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions.results || []) {
    try {
      // In production, use web-push library or Cloudflare's push service
      // This is a placeholder for the actual push implementation
      const success = await sendWebPush(
        env,
        {
          endpoint: sub.endpoint as string,
          keys: {
            p256dh: sub.p256dh as string,
            auth: sub.auth as string,
          },
        },
        payload
      );

      if (success) {
        sent++;
        // Update last used timestamp
        await env.DB.prepare(
          'UPDATE push_subscriptions SET last_used_at = ? WHERE endpoint = ?'
        ).bind(now(), sub.endpoint).run();
      } else {
        failed++;
      }
    } catch (error) {
      console.error('Push notification error:', error);
      failed++;

      // If subscription is invalid, remove it
      if ((error as any)?.statusCode === 410) {
        await env.DB.prepare(
          'DELETE FROM push_subscriptions WHERE endpoint = ?'
        ).bind(sub.endpoint).run();
      }
    }
  }

  // Save notification to history
  await env.DB.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, data, channel, sent_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'push', ?, ?)
  `).bind(
    generateId(),
    userId,
    payload.data?.type || 'general',
    payload.title,
    payload.body,
    JSON.stringify(payload.data || {}),
    now(),
    now()
  ).run();

  return { sent, failed };
}

// Placeholder for actual web push implementation
async function sendWebPush(
  env: Env,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: NotificationPayload
): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Create a signed JWT using VAPID private key
  // 2. Encrypt the payload using the subscription keys
  // 3. Send the encrypted payload to the subscription endpoint

  // For Cloudflare Workers, you'd typically use a library like cf-webpush
  // or implement the Web Push protocol manually

  console.log('Would send push to:', subscription.endpoint);
  console.log('Payload:', payload);

  // Placeholder - return true to simulate success
  return true;
}
