import { Hono } from 'hono';
import type { Env, UserType } from '../../types';
import { hashPassword, verifyPassword, generateToken } from '../../utils/helpers';
import { isValidEmail, isValidPhone, isValidPassword, isValidZipCode, formatPhone } from '../../utils/validation';
import { isNEOZipCode, getZipCoordinates, getZipCity } from '../../services/geocoding';
import { createUser, getUserByEmail, emailExists, createHomeownerProfile, createTeenProfile } from '../../db/queries/users';
import { createSession, deleteSession, setSessionCookie, clearSessionCookie } from '../../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/register
 * Register a new user (homeowner, teen, or parent)
 */
authRoutes.post('/register', async (c) => {
  let body: {
    type: UserType;
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    // Teen-specific
    age?: number;
    school_name?: string;
    parent_email?: string;
    // Homeowner-specific
    property_type?: string;
    driveway_size?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { type, email, password, name, phone, address, city, zip } = body;

  // Validate required fields
  if (!type || !['homeowner', 'teen', 'parent'].includes(type)) {
    return c.json({ success: false, error: 'Invalid user type. Must be homeowner, teen, or parent.' }, 400);
  }

  if (!email || !isValidEmail(email)) {
    return c.json({ success: false, error: 'Valid email address is required' }, 400);
  }

  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return c.json({ success: false, error: passwordValidation.message }, 400);
  }

  if (!name || name.trim().length < 2) {
    return c.json({ success: false, error: 'Name must be at least 2 characters' }, 400);
  }

  // Validate phone if provided
  if (phone && !isValidPhone(phone)) {
    return c.json({ success: false, error: 'Invalid phone number format' }, 400);
  }

  // Validate ZIP code for homeowners and teens (they need addresses)
  if (type === 'homeowner' || type === 'teen') {
    if (!zip || !isValidZipCode(zip)) {
      return c.json({ success: false, error: 'Valid 5-digit ZIP code is required' }, 400);
    }

    if (!isNEOZipCode(zip)) {
      return c.json(
        {
          success: false,
          error: 'Service is currently only available in Northeast Ohio. Please enter a valid NEO ZIP code.',
        },
        400
      );
    }

    if (!address || address.trim().length < 5) {
      return c.json({ success: false, error: 'Street address is required' }, 400);
    }
  }

  // Teen-specific validation
  if (type === 'teen') {
    const age = body.age;
    if (!age || age < 13 || age > 17) {
      return c.json({ success: false, error: 'Teen workers must be between 13-17 years old' }, 400);
    }

    if (!body.parent_email || !isValidEmail(body.parent_email)) {
      return c.json({ success: false, error: 'Parent email is required for teen registration' }, 400);
    }

    if (body.parent_email.toLowerCase() === email.toLowerCase()) {
      return c.json({ success: false, error: 'Parent email must be different from teen email' }, 400);
    }
  }

  // Check for duplicate email
  const existingUser = await emailExists(c.env.DB, email);
  if (existingUser) {
    return c.json(
      {
        success: false,
        error: 'An account with this email already exists. Please log in or use a different email.',
      },
      409
    );
  }

  // Get coordinates from ZIP
  const coords = zip ? getZipCoordinates(zip) : null;
  const derivedCity = zip ? getZipCity(zip) : null;

  // Hash password
  const password_hash = await hashPassword(password);

  try {
    // Create user
    const user = await createUser(c.env.DB, {
      type,
      email,
      password_hash,
      name: name.trim(),
      phone: phone ? formatPhone(phone) : undefined,
      address: address?.trim(),
      city: city?.trim() || derivedCity || undefined,
      zip,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    // Create type-specific profile
    if (type === 'homeowner') {
      await createHomeownerProfile(c.env.DB, {
        user_id: user.id,
        property_type: body.property_type,
        driveway_size: body.driveway_size,
      });
    } else if (type === 'teen') {
      await createTeenProfile(c.env.DB, {
        user_id: user.id,
        age: body.age!,
        school_name: body.school_name,
      });

      // Create parent consent request
      const consentToken = generateToken(32);
      await c.env.DB.prepare(
        `INSERT INTO parent_consents (id, teen_user_id, parent_email, consent_token, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(crypto.randomUUID(), user.id, body.parent_email!.toLowerCase(), consentToken, new Date().toISOString())
        .run();

      // TODO: Send consent email to parent
      // For MVP, we'll log the consent link
      console.log(`Consent link for ${body.parent_email}: ${c.env.APP_URL}/consent/${consentToken}`);
    }

    // Create session
    const sessionId = await createSession(c.env.SESSIONS, user.id, user.type, user.email, user.name);

    // Build response
    const response = c.json({
      success: true,
      message: type === 'teen' ? 'Registration successful! We sent a consent request to your parent.' : 'Registration successful!',
      data: {
        user: {
          id: user.id,
          type: user.type,
          email: user.email,
          name: user.name,
          city: user.city,
          verified: type !== 'teen', // Teens need parent consent
        },
      },
    });

    // Set session cookie (7 days)
    return setSessionCookie(response, sessionId, 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('Registration error:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json(
        {
          success: false,
          error: 'An account with this email already exists.',
        },
        409
      );
    }

    return c.json(
      {
        success: false,
        error: 'Registration failed. Please try again.',
      },
      500
    );
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRoutes.post('/login', async (c) => {
  let body: { email: string; password: string };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: 'Email and password are required' }, 400);
  }

  // Find user
  const user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    return c.json({ success: false, error: 'Invalid email or password' }, 401);
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid email or password' }, 401);
  }

  // Create session
  const sessionId = await createSession(c.env.SESSIONS, user.id, user.type, user.email, user.name);

  // Check if teen is verified
  let verified = true;
  if (user.type === 'teen') {
    const consent = await c.env.DB.prepare('SELECT consent_given FROM parent_consents WHERE teen_user_id = ?')
      .bind(user.id)
      .first<{ consent_given: number }>();
    verified = consent?.consent_given === 1;
  }

  const response = c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        type: user.type,
        email: user.email,
        name: user.name,
        city: user.city,
        verified,
      },
    },
  });

  return setSessionCookie(response, sessionId, 7 * 24 * 60 * 60);
});

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
authRoutes.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'session' && value) {
        await deleteSession(c.env.SESSIONS, value);
        break;
      }
    }
  }

  const response = c.json({ success: true, message: 'Logged out successfully' });
  return clearSessionCookie(response);
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
authRoutes.get('/me', async (c) => {
  const cookieHeader = c.req.header('Cookie');
  let sessionId: string | undefined;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'session') {
        sessionId = value;
        break;
      }
    }
  }

  if (!sessionId) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const session = await c.env.SESSIONS.get(sessionId, 'json') as { userId: string; userType: UserType; email: string; name: string; expiresAt: number } | null;

  if (!session || Date.now() > session.expiresAt) {
    return c.json({ success: false, error: 'Session expired' }, 401);
  }

  // Get full user data
  const user = await getUserByEmail(c.env.DB, session.email);
  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  // Check verification status for teens
  let verified = true;
  if (user.type === 'teen') {
    const consent = await c.env.DB.prepare('SELECT consent_given FROM parent_consents WHERE teen_user_id = ?')
      .bind(user.id)
      .first<{ consent_given: number }>();
    verified = consent?.consent_given === 1;
  }

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        type: user.type,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        zip: user.zip,
        verified,
      },
    },
  });
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
authRoutes.post('/forgot-password', async (c) => {
  // TODO: Implement forgot password with email sending
  return c.json({ success: false, error: 'Not implemented yet' }, 501);
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
authRoutes.post('/reset-password', async (c) => {
  // TODO: Implement reset password
  return c.json({ success: false, error: 'Not implemented yet' }, 501);
});

/**
 * GET /api/auth/consent/:token
 * Get consent request details for parent
 */
authRoutes.get('/consent/:token', async (c) => {
  const token = c.req.param('token');

  const consent = await c.env.DB.prepare(
    `SELECT pc.*, u.name as teen_name, u.email as teen_email, tp.age
     FROM parent_consents pc
     JOIN users u ON pc.teen_user_id = u.id
     JOIN teen_profiles tp ON tp.user_id = u.id
     WHERE pc.consent_token = ?`
  )
    .bind(token)
    .first<{
      id: string;
      teen_user_id: string;
      parent_email: string;
      consent_given: number;
      teen_name: string;
      teen_email: string;
      age: number;
    }>();

  if (!consent) {
    return c.json({ success: false, error: 'Invalid or expired consent link' }, 404);
  }

  if (consent.consent_given) {
    return c.json({ success: false, error: 'Consent has already been given' }, 400);
  }

  return c.json({
    success: true,
    data: {
      teenName: consent.teen_name,
      teenAge: consent.age,
      parentEmail: consent.parent_email,
    },
  });
});

/**
 * POST /api/auth/consent/:token
 * Parent consent approval/rejection
 */
authRoutes.post('/consent/:token', async (c) => {
  const token = c.req.param('token');

  let body: { approved: boolean; parent_name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const consent = await c.env.DB.prepare('SELECT * FROM parent_consents WHERE consent_token = ?')
    .bind(token)
    .first<{
      id: string;
      teen_user_id: string;
      parent_email: string;
      consent_given: number;
    }>();

  if (!consent) {
    return c.json({ success: false, error: 'Invalid or expired consent link' }, 404);
  }

  if (consent.consent_given) {
    return c.json({ success: false, error: 'Consent has already been processed' }, 400);
  }

  if (body.approved) {
    // Update consent record
    await c.env.DB.prepare(
      `UPDATE parent_consents
       SET consent_given = 1, consent_given_at = ?, consent_method = 'web'
       WHERE id = ?`
    )
      .bind(new Date().toISOString(), consent.id)
      .run();

    // Update teen profile to verified
    await c.env.DB.prepare('UPDATE teen_profiles SET verified = 1, verified_at = ? WHERE user_id = ?')
      .bind(new Date().toISOString(), consent.teen_user_id)
      .run();

    return c.json({
      success: true,
      message: 'Thank you! Your child can now accept snow removal jobs.',
    });
  } else {
    // Parent declined - we keep the record but don't verify
    await c.env.DB.prepare(
      `UPDATE parent_consents
       SET consent_given = 0, consent_given_at = ?, consent_method = 'web_declined'
       WHERE id = ?`
    )
      .bind(new Date().toISOString(), consent.id)
      .run();

    return c.json({
      success: true,
      message: 'Consent declined. The account will remain unverified.',
    });
  }
});
