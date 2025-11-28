// Stripe API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';
import { getUserById } from '../../db/queries/users';
import { getJobById } from '../../db/queries/jobs';
import {
  getOrCreateCustomer,
  createPaymentIntent,
  createConnectAccountLink,
  getConnectAccountStatus,
  getPaymentMethods,
  createSetupIntent,
} from '../../services/stripe.service';

const stripe = new Hono<{ Bindings: Env }>();

// Apply auth middleware
stripe.use('*', authMiddleware());

// Get publishable key
stripe.get('/config', (c) => {
  return c.json({
    success: true,
    data: {
      publishableKey: c.env.STRIPE_PUBLISHABLE_KEY,
    },
  });
});

// Create payment intent for a job
stripe.post('/payment-intent', requireAuth(), requireUserType('homeowner'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { job_id, amount } = await c.req.json();

    if (!job_id || !amount) {
      return c.json({ success: false, error: 'Job ID and amount are required' }, 400);
    }

    const job = await getJobById(c.env.DB, job_id);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    if (job.homeowner_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    if (!job.worker_id) {
      return c.json({ success: false, error: 'Job has no assigned worker' }, 400);
    }

    const worker = await getUserById(c.env.DB, job.worker_id);
    if (!worker) {
      return c.json({ success: false, error: 'Worker not found' }, 404);
    }

    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      c.env,
      job,
      user!,
      worker,
      amount
    );

    return c.json({
      success: true,
      data: {
        clientSecret,
        paymentIntentId,
      },
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return c.json({ success: false, error: 'Failed to create payment intent' }, 500);
  }
});

// Get saved payment methods
stripe.get('/payment-methods', requireAuth(), requireUserType('homeowner'), async (c) => {
  try {
    const user = getCurrentUser(c);

    if (!user!.stripe_customer_id) {
      return c.json({ success: true, data: [] });
    }

    const methods = await getPaymentMethods(c.env, user!.stripe_customer_id);

    return c.json({
      success: true,
      data: methods.map(m => ({
        id: m.id,
        type: m.type,
        brand: m.card?.brand,
        last4: m.card?.last4,
        expiry: m.card ? `${m.card.exp_month}/${m.card.exp_year}` : null,
      })),
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return c.json({ success: false, error: 'Failed to get payment methods' }, 500);
  }
});

// Create setup intent for adding payment method
stripe.post('/setup-intent', requireAuth(), requireUserType('homeowner'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const customerId = await getOrCreateCustomer(c.env, user!);
    const { clientSecret } = await createSetupIntent(c.env, customerId);

    return c.json({
      success: true,
      data: { clientSecret },
    });
  } catch (error) {
    console.error('Create setup intent error:', error);
    return c.json({ success: false, error: 'Failed to create setup intent' }, 500);
  }
});

// Start Stripe Connect onboarding (for parents of teen workers)
stripe.post('/connect/onboard', requireAuth(), requireUserType('parent'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const returnUrl = `${c.env.APP_URL}/parent/settings?stripe=complete`;
    const refreshUrl = `${c.env.APP_URL}/parent/settings?stripe=refresh`;

    const onboardingUrl = await createConnectAccountLink(
      c.env,
      user!,
      returnUrl,
      refreshUrl
    );

    return c.json({
      success: true,
      data: { url: onboardingUrl },
    });
  } catch (error) {
    console.error('Create Connect account error:', error);
    return c.json({ success: false, error: 'Failed to start onboarding' }, 500);
  }
});

// Get Connect account status
stripe.get('/connect/status', requireAuth(), requireUserType('parent'), async (c) => {
  try {
    const user = getCurrentUser(c);

    if (!user!.stripe_connect_id) {
      return c.json({
        success: true,
        data: { status: 'not_connected' },
      });
    }

    const status = await getConnectAccountStatus(c.env, user!.stripe_connect_id);

    let statusText = 'pending';
    if (status.payouts_enabled && status.charges_enabled) {
      statusText = 'active';
    } else if (status.details_submitted) {
      statusText = 'review';
    }

    return c.json({
      success: true,
      data: {
        status: statusText,
        ...status,
      },
    });
  } catch (error) {
    console.error('Get Connect status error:', error);
    return c.json({ success: false, error: 'Failed to get account status' }, 500);
  }
});

export default stripe;
