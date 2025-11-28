// Parent consent API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { generateToken, now } from '../../utils/helpers';
import {
  getParentConsentByToken,
  grantParentConsent,
  createParentConsent,
  getParentConsentByTeenId,
} from '../../db/queries/users';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';

const consent = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
consent.use('*', authMiddleware());

// Get consent status for teen
consent.get('/status', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const consentRecord = await getParentConsentByTeenId(c.env.DB, user!.id);

    if (!consentRecord) {
      return c.json({
        success: true,
        data: {
          status: 'not_requested',
          message: 'Parent consent has not been requested',
        },
      });
    }

    if (consentRecord.consent_given) {
      return c.json({
        success: true,
        data: {
          status: 'approved',
          consent_given_at: consentRecord.consent_given_at,
          parent_email: consentRecord.parent_email,
        },
      });
    }

    // Check if expired
    if (consentRecord.expires_at && new Date(consentRecord.expires_at) < new Date()) {
      return c.json({
        success: true,
        data: {
          status: 'expired',
          message: 'Consent request has expired',
          parent_email: consentRecord.parent_email,
        },
      });
    }

    return c.json({
      success: true,
      data: {
        status: 'pending',
        message: 'Waiting for parent approval',
        parent_email: consentRecord.parent_email,
        created_at: consentRecord.created_at,
        expires_at: consentRecord.expires_at,
      },
    });
  } catch (error) {
    console.error('Get consent status error:', error);
    return c.json({ success: false, error: 'Failed to get consent status' }, 500);
  }
});

// Resend consent request (teen only)
consent.post('/resend', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { parent_email, parent_name } = await c.req.json();

    // Validate email
    if (!parent_email || !parent_email.includes('@')) {
      return c.json({ success: false, error: 'Valid parent email is required' }, 400);
    }

    // Check existing consent
    const existingConsent = await getParentConsentByTeenId(c.env.DB, user!.id);

    // If already approved, don't allow resend
    if (existingConsent?.consent_given) {
      return c.json({ success: false, error: 'Parent consent already granted' }, 400);
    }

    // Create new consent request
    const consentToken = await generateToken(32);
    await createParentConsent(c.env.DB, {
      teen_user_id: user!.id,
      parent_email,
      parent_name: parent_name || existingConsent?.parent_name,
      consent_token: consentToken,
      consent_method: 'email_link',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // TODO: Send email to parent
    console.log(`Consent request email would be sent to ${parent_email} with token: ${consentToken}`);

    return c.json({
      success: true,
      message: 'Consent request sent to parent',
    });
  } catch (error) {
    console.error('Resend consent error:', error);
    return c.json({ success: false, error: 'Failed to resend consent request' }, 500);
  }
});

// Verify consent token (public route for parent to view)
consent.get('/verify/:token', async (c) => {
  try {
    const { token } = c.req.param();

    const consentRecord = await getParentConsentByToken(c.env.DB, token);

    if (!consentRecord) {
      return c.json({ success: false, error: 'Invalid consent token' }, 404);
    }

    if (consentRecord.consent_given) {
      return c.json({
        success: true,
        data: {
          status: 'already_approved',
          message: 'Consent has already been granted',
        },
      });
    }

    // Check if expired
    if (consentRecord.expires_at && new Date(consentRecord.expires_at) < new Date()) {
      return c.json({
        success: false,
        error: 'Consent request has expired',
      }, 400);
    }

    // Get teen info
    const teen = await c.env.DB.prepare(
      'SELECT name, email FROM users WHERE id = ?'
    ).bind(consentRecord.teen_user_id).first<{ name: string; email: string }>();

    return c.json({
      success: true,
      data: {
        status: 'pending',
        teen_name: teen?.name,
        teen_email: teen?.email,
        parent_name: consentRecord.parent_name,
        parent_email: consentRecord.parent_email,
        created_at: consentRecord.created_at,
      },
    });
  } catch (error) {
    console.error('Verify consent token error:', error);
    return c.json({ success: false, error: 'Failed to verify consent token' }, 500);
  }
});

// Grant consent (parent action)
consent.post('/grant/:token', async (c) => {
  try {
    const { token } = c.req.param();
    const body = await c.req.json().catch(() => ({}));

    // Get client IP for logging
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For') ||
               'unknown';

    // Check if token is valid
    const consentRecord = await getParentConsentByToken(c.env.DB, token);

    if (!consentRecord) {
      return c.json({ success: false, error: 'Invalid consent token' }, 404);
    }

    if (consentRecord.consent_given) {
      return c.json({ success: false, error: 'Consent has already been granted' }, 400);
    }

    if (consentRecord.expires_at && new Date(consentRecord.expires_at) < new Date()) {
      return c.json({ success: false, error: 'Consent request has expired' }, 400);
    }

    // If parent is logged in, use their user ID
    const user = getCurrentUser(c);
    const parentUserId = user?.type === 'parent' ? user.id : null;

    // Require agreement checkbox
    if (!body.agreed) {
      return c.json({ success: false, error: 'You must agree to the terms' }, 400);
    }

    // Grant consent
    const success = await grantParentConsent(c.env.DB, token, parentUserId, ip);

    if (!success) {
      return c.json({ success: false, error: 'Failed to grant consent' }, 500);
    }

    // TODO: Send confirmation email to teen and parent

    return c.json({
      success: true,
      message: 'Consent granted successfully',
    });
  } catch (error) {
    console.error('Grant consent error:', error);
    return c.json({ success: false, error: 'Failed to grant consent' }, 500);
  }
});

// Revoke consent (parent only)
consent.post('/revoke', requireAuth(), requireUserType('parent'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { teen_user_id } = await c.req.json();

    if (!teen_user_id) {
      return c.json({ success: false, error: 'Teen user ID is required' }, 400);
    }

    // Verify parent has consent record for this teen
    const consentRecord = await c.env.DB.prepare(`
      SELECT * FROM parent_consents
      WHERE teen_user_id = ? AND parent_user_id = ? AND consent_given = 1
    `).bind(teen_user_id, user!.id).first();

    if (!consentRecord) {
      return c.json({ success: false, error: 'No consent record found' }, 404);
    }

    // Revoke consent - update teen profile
    await c.env.DB.prepare(`
      UPDATE teen_profiles
      SET verified = 0, verified_at = NULL, updated_at = ?
      WHERE user_id = ?
    `).bind(now(), teen_user_id).run();

    // Update consent record
    await c.env.DB.prepare(`
      UPDATE parent_consents
      SET consent_given = 0, consent_given_at = NULL
      WHERE teen_user_id = ? AND parent_user_id = ?
    `).bind(teen_user_id, user!.id).run();

    // TODO: Notify teen

    return c.json({
      success: true,
      message: 'Consent revoked successfully',
    });
  } catch (error) {
    console.error('Revoke consent error:', error);
    return c.json({ success: false, error: 'Failed to revoke consent' }, 500);
  }
});

export default consent;
