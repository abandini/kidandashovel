// Authentication service for A Kid and a Shovel

import type { Env, User, Session, UserType } from '../types';
import { generateId, generateToken, hashPassword, verifyPassword, now, addDays } from '../utils/helpers';
import { createUser, getUserByEmail, getUserById, updateUser, verifyEmail as verifyEmailDb } from '../db/queries/users';

const SESSION_DURATION_DAYS = 30;
const SESSION_PREFIX = 'session:';

export interface LoginResult {
  success: boolean;
  user?: User;
  session?: Session;
  token?: string;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  session?: Session;
  token?: string;
  verificationToken?: string;
  error?: string;
}

export async function register(
  env: Env,
  data: {
    email: string;
    password: string;
    name: string;
    type: UserType;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  }
): Promise<RegisterResult> {
  // Check if user already exists
  const existingUser = await getUserByEmail(env.DB, data.email);
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Hash password
  const password_hash = await hashPassword(data.password);

  // Generate email verification token
  const verificationToken = await generateToken(32);

  // Create user
  try {
    const user = await createUser(env.DB, {
      type: data.type,
      email: data.email,
      phone: data.phone,
      password_hash,
      name: data.name,
      address: data.address,
      city: data.city,
      state: 'OH',
      zip: data.zip,
      lat: data.lat,
      lng: data.lng,
      email_verification_token: verificationToken,
    });

    // Create session
    const { session, token } = await createSession(env, user);

    return {
      success: true,
      user,
      session,
      token,
      verificationToken,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function login(
  env: Env,
  email: string,
  password: string
): Promise<LoginResult> {
  // Find user by email
  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Create session
  const { session, token } = await createSession(env, user);

  return {
    success: true,
    user,
    session,
    token,
  };
}

export async function logout(env: Env, token: string): Promise<void> {
  await env.SESSIONS.delete(SESSION_PREFIX + token);
}

export async function getSessionByToken(
  env: Env,
  token: string
): Promise<Session | null> {
  const sessionData = await env.SESSIONS.get(SESSION_PREFIX + token, 'json');
  if (!sessionData) return null;

  const session = sessionData as Session;

  // Check if session is expired
  if (new Date(session.expires_at) < new Date()) {
    await env.SESSIONS.delete(SESSION_PREFIX + token);
    return null;
  }

  // Get fresh user data
  const user = await getUserById(env.DB, session.user_id);
  if (!user) {
    await env.SESSIONS.delete(SESSION_PREFIX + token);
    return null;
  }

  return {
    ...session,
    user,
  };
}

export async function createSession(
  env: Env,
  user: User
): Promise<{ session: Session; token: string }> {
  const token = await generateToken(64);
  const expiresAt = addDays(new Date(), SESSION_DURATION_DAYS);

  const session: Session = {
    id: generateId(),
    user_id: user.id,
    user,
    expires_at: expiresAt.toISOString(),
    created_at: now(),
  };

  // Store in KV with TTL
  await env.SESSIONS.put(
    SESSION_PREFIX + token,
    JSON.stringify(session),
    { expirationTtl: SESSION_DURATION_DAYS * 24 * 60 * 60 }
  );

  return { session, token };
}

export async function refreshSession(
  env: Env,
  token: string
): Promise<Session | null> {
  const session = await getSessionByToken(env, token);
  if (!session) return null;

  // Extend session expiration
  const expiresAt = addDays(new Date(), SESSION_DURATION_DAYS);
  session.expires_at = expiresAt.toISOString();

  await env.SESSIONS.put(
    SESSION_PREFIX + token,
    JSON.stringify(session),
    { expirationTtl: SESSION_DURATION_DAYS * 24 * 60 * 60 }
  );

  return session;
}

export async function verifyEmail(
  env: Env,
  token: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = await verifyEmailDb(env.DB, token);
  if (!user) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  return { success: true, user };
}

export async function requestPasswordReset(
  env: Env,
  email: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    // Return success even if user doesn't exist (security)
    return { success: true };
  }

  const resetToken = await generateToken(32);
  const expires = addDays(new Date(), 1); // 24 hours

  await updateUser(env.DB, user.id, {
    password_reset_token: resetToken,
    password_reset_expires: expires.toISOString(),
  });

  return { success: true, token: resetToken };
}

export async function resetPassword(
  env: Env,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Find user by reset token
  const result = await env.DB.prepare(`
    SELECT * FROM users WHERE password_reset_token = ?
  `).bind(token).first<User>();

  if (!result) {
    return { success: false, error: 'Invalid or expired reset token' };
  }

  // Check if token is expired
  if (result.password_reset_expires && new Date(result.password_reset_expires) < new Date()) {
    return { success: false, error: 'Reset token has expired' };
  }

  // Hash new password
  const password_hash = await hashPassword(newPassword);

  // Update user
  await updateUser(env.DB, result.id, {
    password_hash,
    password_reset_token: undefined,
    password_reset_expires: undefined,
  });

  return { success: true };
}

export async function changePassword(
  env: Env,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getUserById(env.DB, userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Hash new password
  const password_hash = await hashPassword(newPassword);

  // Update user
  await updateUser(env.DB, userId, { password_hash });

  return { success: true };
}

// Helper to extract session from request
export function getSessionToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies.session) {
      return cookies.session;
    }
  }

  return null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  }
  return cookies;
}

// Create session cookie for browser authentication
export function createSessionCookie(token: string, secure: boolean = true): string {
  const expires = addDays(new Date(), SESSION_DURATION_DAYS);
  const parts = [
    `session=${encodeURIComponent(token)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expires.toUTCString()}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearSessionCookie(): string {
  return 'session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
