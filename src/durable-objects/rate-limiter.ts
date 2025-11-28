/**
 * Durable Object for notification rate limiting
 * Prevents spam by limiting notifications per user per type
 */
export class NotificationRateLimiter {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/can-notify' && request.method === 'POST') {
      const { userId, type, windowHours = 12 } = await request.json() as {
        userId: string;
        type: string;
        windowHours?: number;
      };
      const allowed = await this.canNotify(userId, type, windowHours);
      return new Response(JSON.stringify({ allowed }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/reset' && request.method === 'POST') {
      const { userId, type } = await request.json() as { userId: string; type: string };
      await this.reset(userId, type);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Check if a notification can be sent, and mark it as sent if allowed
   * @param userId - The user ID to check
   * @param type - The notification type (e.g., 'snow_alert', 'job_notification')
   * @param windowHours - Time window in hours (default 12)
   * @returns true if notification is allowed, false if rate limited
   */
  async canNotify(userId: string, type: string, windowHours: number = 12): Promise<boolean> {
    const key = `${userId}:${type}`;
    const lastSent = await this.state.storage.get<number>(key);
    const windowMs = windowHours * 60 * 60 * 1000;

    if (lastSent && Date.now() - lastSent < windowMs) {
      return false;
    }

    // Mark this notification as sent
    await this.state.storage.put(key, Date.now());
    return true;
  }

  /**
   * Reset the rate limit for a specific user/type combination
   */
  async reset(userId: string, type: string): Promise<void> {
    const key = `${userId}:${type}`;
    await this.state.storage.delete(key);
  }

  /**
   * Get the time until next notification is allowed
   */
  async getTimeUntilAllowed(userId: string, type: string, windowHours: number = 12): Promise<number> {
    const key = `${userId}:${type}`;
    const lastSent = await this.state.storage.get<number>(key);
    const windowMs = windowHours * 60 * 60 * 1000;

    if (!lastSent) {
      return 0;
    }

    const elapsed = Date.now() - lastSent;
    const remaining = windowMs - elapsed;
    return Math.max(0, remaining);
  }
}
