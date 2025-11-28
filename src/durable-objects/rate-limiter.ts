// Notification Rate Limiter Durable Object for A Kid and a Shovel

export class NotificationRateLimiter implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/can-notify':
        return this.canNotify();
      case '/reset':
        return this.reset();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async canNotify(): Promise<Response> {
    const lastSent = await this.state.storage.get<number>('lastSent');
    const now = Date.now();

    // Rate limit: 12 hours between notifications of the same type
    const rateLimitMs = 12 * 60 * 60 * 1000;

    if (lastSent && now - lastSent < rateLimitMs) {
      return Response.json(false);
    }

    // Update last sent time
    await this.state.storage.put('lastSent', now);

    return Response.json(true);
  }

  private async reset(): Promise<Response> {
    await this.state.storage.delete('lastSent');
    return Response.json({ success: true });
  }
}
