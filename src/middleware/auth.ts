import { createMiddleware } from 'hono/factory';
import type { Env, SessionData, UserType } from '../types';

/**
 * Authentication middleware
 * Validates session and attaches user data to context
 */
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: {
    session: SessionData;
  };
}>(async (c, next) => {
  // Get session ID from cookie
  const sessionId = getCookie(c.req.raw, 'session');

  if (!sessionId) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  // Look up session in KV
  const sessionData = await c.env.SESSIONS.get<SessionData>(sessionId, 'json');

  if (!sessionData) {
    // Clear invalid cookie
    return c.json({ success: false, error: 'Session expired' }, 401);
  }

  // Check if session has expired
  if (Date.now() > sessionData.expiresAt) {
    await c.env.SESSIONS.delete(sessionId);
    return c.json({ success: false, error: 'Session expired' }, 401);
  }

  // Attach session to context
  c.set('session', sessionData);

  await next();
});

/**
 * Role-based authorization middleware
 * Restricts access to specific user types
 */
export function requireUserType(...allowedTypes: UserType[]) {
  return createMiddleware<{
    Bindings: Env;
    Variables: {
      session: SessionData;
    };
  }>(async (c, next) => {
    const session = c.get('session');

    if (!session) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    if (!allowedTypes.includes(session.userType)) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    await next();
  });
}

/**
 * Optional auth middleware - attaches session if present but doesn't require it
 */
export const optionalAuth = createMiddleware<{
  Bindings: Env;
  Variables: {
    session: SessionData | null;
  };
}>(async (c, next) => {
  const sessionId = getCookie(c.req.raw, 'session');

  if (sessionId) {
    const sessionData = await c.env.SESSIONS.get<SessionData>(sessionId, 'json');
    if (sessionData && Date.now() <= sessionData.expiresAt) {
      c.set('session', sessionData);
    } else {
      c.set('session', null);
    }
  } else {
    c.set('session', null);
  }

  await next();
});

/**
 * Create a new session
 */
export async function createSession(
  kv: KVNamespace,
  userId: string,
  userType: UserType,
  email: string,
  name: string,
  durationDays: number = 7
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

  const sessionData: SessionData = {
    userId,
    userType,
    email,
    name,
    createdAt: Date.now(),
    expiresAt,
  };

  await kv.put(sessionId, JSON.stringify(sessionData), {
    expirationTtl: durationDays * 24 * 60 * 60,
  });

  return sessionId;
}

/**
 * Delete a session
 */
export async function deleteSession(kv: KVNamespace, sessionId: string): Promise<void> {
  await kv.delete(sessionId);
}

/**
 * Set session cookie on response
 */
export function setSessionCookie(response: Response, sessionId: string, maxAge: number): Response {
  const cookie = `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  response.headers.append('Set-Cookie', cookie);
  return response;
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: Response): Response {
  const cookie = 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  response.headers.append('Set-Cookie', cookie);
  return response;
}

/**
 * Get cookie value from request
 */
function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return undefined;
}
