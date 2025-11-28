// Authentication API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env, UserType } from '../../types';
import { validateRegistration, validateTeenRegistration } from '../../utils/validation';
import { isNEOZipCode } from '../../utils/geo';
import {
  register,
  login,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  createSessionCookie,
  clearSessionCookie,
  getSessionToken,
} from '../../services/auth.service';
import { createTeenProfile, createHomeownerProfile, createParentConsent } from '../../db/queries/users';
import { generateToken } from '../../utils/helpers';
import { authMiddleware, requireAuth, getCurrentUser } from '../../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
auth.use('*', authMiddleware());

// Register new user
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { type, email, password, name, phone, address, city, zip, lat, lng } = body;

    // Validate base registration
    const validation = validateRegistration({ email, password, name, phone, address, city, zip, type });
    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    // Validate NEO ZIP code
    if (!isNEOZipCode(zip, c.env.NEO_ZIP_PREFIXES)) {
      return c.json({
        success: false,
        error: 'Service is only available in Northeast Ohio',
      }, 400);
    }

    // For teens, validate additional fields
    if (type === 'teen') {
      const { age, birth_date, school_name, parent_email, parent_name } = body;
      const teenValidation = validateTeenRegistration({
        age,
        birth_date,
        school_name,
        parent_email,
        parent_name,
      });

      if (!teenValidation.valid) {
        return c.json({ success: false, errors: teenValidation.errors }, 400);
      }
    }

    // Register user
    const result = await register(c.env, {
      type: type as UserType,
      email,
      password,
      name,
      phone,
      address,
      city,
      zip,
      lat,
      lng,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    // Create type-specific profile
    if (type === 'teen') {
      const { age, birth_date, school_name, parent_email, parent_name, services, equipment, travel_radius_miles } = body;

      await createTeenProfile(c.env.DB, {
        user_id: result.user!.id,
        age,
        birth_date,
        school_name,
        bio: '',
        services: services || ['driveway'],
        equipment: equipment || ['shovel'],
        travel_radius_miles: travel_radius_miles || 2.0,
        available_now: false,
        availability_schedule: {},
      });

      // Create parent consent request
      const consentToken = await generateToken(32);
      await createParentConsent(c.env.DB, {
        teen_user_id: result.user!.id,
        parent_email,
        parent_name,
        consent_token: consentToken,
        consent_method: 'email_link',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

      // TODO: Send parent consent email
    } else if (type === 'homeowner') {
      const { property_type, driveway_size, special_instructions, preferred_payment_method } = body;

      await createHomeownerProfile(c.env.DB, {
        user_id: result.user!.id,
        property_type: property_type || 'house',
        driveway_size,
        special_instructions,
        preferred_payment_method: preferred_payment_method || 'cash',
      });
    }

    // Set session cookie
    const isSecure = c.env.ENVIRONMENT === 'production';
    c.header('Set-Cookie', createSessionCookie(result.token!, isSecure));

    return c.json({
      success: true,
      user: {
        id: result.user!.id,
        type: result.user!.type,
        email: result.user!.email,
        name: result.user!.name,
        email_verified: result.user!.email_verified,
      },
      requiresParentConsent: type === 'teen',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// Login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const result = await login(c.env, email, password);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 401);
    }

    // Set session cookie
    const isSecure = c.env.ENVIRONMENT === 'production';
    c.header('Set-Cookie', createSessionCookie(result.token!, isSecure));

    return c.json({
      success: true,
      user: {
        id: result.user!.id,
        type: result.user!.type,
        email: result.user!.email,
        name: result.user!.name,
        email_verified: result.user!.email_verified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// Logout
auth.post('/logout', async (c) => {
  const token = getSessionToken(c.req.raw);

  if (token) {
    await logout(c.env, token);
  }

  c.header('Set-Cookie', clearSessionCookie());

  return c.json({ success: true });
});

// Get current user
auth.get('/me', requireAuth(), async (c) => {
  const user = getCurrentUser(c);

  return c.json({
    success: true,
    user: {
      id: user!.id,
      type: user!.type,
      email: user!.email,
      name: user!.name,
      phone: user!.phone,
      address: user!.address,
      city: user!.city,
      state: user!.state,
      zip: user!.zip,
      email_verified: user!.email_verified,
      created_at: user!.created_at,
    },
  });
});

// Verify email
auth.post('/verify-email', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ success: false, error: 'Verification token is required' }, 400);
    }

    const result = await verifyEmail(c.env, token);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Email verification error:', error);
    return c.json({ success: false, error: 'Verification failed' }, 500);
  }
});

// Request password reset
auth.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    const result = await requestPasswordReset(c.env, email);

    // Always return success for security (don't reveal if email exists)
    // TODO: Send reset email if token was generated
    if (result.token) {
      console.log('Password reset token:', result.token); // In production, send email
    }

    return c.json({
      success: true,
      message: 'If an account exists with this email, a reset link will be sent',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ success: false, error: 'Request failed' }, 500);
  }
});

// Reset password with token
auth.post('/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json();

    if (!token || !password) {
      return c.json({ success: false, error: 'Token and new password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
    }

    const result = await resetPassword(c.env, token, password);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return c.json({ success: false, error: 'Reset failed' }, 500);
  }
});

// Change password (authenticated)
auth.post('/change-password', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ success: false, error: 'Current and new passwords are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ success: false, error: 'New password must be at least 8 characters' }, 400);
    }

    const result = await changePassword(c.env, user!.id, currentPassword, newPassword);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return c.json({ success: false, error: 'Change failed' }, 500);
  }
});

export default auth;
