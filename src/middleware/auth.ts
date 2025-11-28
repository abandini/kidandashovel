// Authentication middleware for A Kid and a Shovel

import { Context, MiddlewareHandler } from 'hono';
import type { Env, User, Session, UserType } from '../types';
import { getSessionToken, getSessionByToken } from '../services/auth.service';

// Extend Hono's context to include user and session
declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    session: Session | null;
  }
}

/**
 * Middleware to extract and validate session from request
 * Sets user and session on context if valid
 */
export function authMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const token = getSessionToken(c.req.raw);

    if (token) {
      const session = await getSessionByToken(c.env, token);
      if (session) {
        c.set('user', session.user);
        c.set('session', session);
      } else {
        c.set('user', null);
        c.set('session', null);
      }
    } else {
      c.set('user', null);
      c.set('session', null);
    }

    await next();
  };
}

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 */
export function requireAuth(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      // Check if this is an API request or page request
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json({ success: false, error: 'Authentication required' }, 401);
      }

      // Redirect to login for page requests
      const returnUrl = encodeURIComponent(c.req.url);
      return c.redirect(`/login?return=${returnUrl}`);
    }

    await next();
  };
}

/**
 * Middleware to require specific user type(s)
 */
export function requireUserType(...types: UserType[]): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json({ success: false, error: 'Authentication required' }, 401);
      }
      return c.redirect('/login');
    }

    if (!types.includes(user.type)) {
      const accept = c.req.header('Accept') || '';
      if (accept.includes('application/json')) {
        return c.json({ success: false, error: 'Access denied' }, 403);
      }
      return c.redirect('/');
    }

    await next();
  };
}

/**
 * Middleware to require verified email
 */
export function requireVerifiedEmail(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!user.email_verified) {
      return c.json({ success: false, error: 'Email verification required' }, 403);
    }

    await next();
  };
}

/**
 * Middleware for verified teen workers
 */
export function requireVerifiedTeen(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (user.type !== 'teen') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Check if teen is verified (has parent consent)
    const profile = await c.env.DB.prepare(
      'SELECT verified FROM teen_profiles WHERE user_id = ?'
    ).bind(user.id).first<{ verified: number }>();

    if (!profile?.verified) {
      return c.json({ success: false, error: 'Parent consent required' }, 403);
    }

    await next();
  };
}

/**
 * Helper to get current user from context
 */
export function getCurrentUser(c: Context): User | null {
  return c.get('user') || null;
}

/**
 * Helper to get current session from context
 */
export function getCurrentSession(c: Context): Session | null {
  return c.get('session') || null;
}

/**
 * Helper to require current user (throws if not authenticated)
 */
export function requireCurrentUser(c: Context): User {
  const user = c.get('user');
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
