// Stripe webhook handler for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { updatePaymentStatus, getJobById } from '../../db/queries/jobs';
import { createEarning, updateEarningStatus } from '../../db/queries/earnings';
import { calculateFees, now } from '../../utils/helpers';
import { sendPushNotification } from './push';

const stripeWebhook = new Hono<{ Bindings: Env }>();

// Stripe webhook endpoint
stripeWebhook.post('/', async (c) => {
  try {
    const signature = c.req.header('Stripe-Signature');
    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }

    const body = await c.req.text();

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(body);
    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(c.env, event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(c.env, event.data.object);
        break;

      case 'transfer.created':
        await handleTransferCreated(c.env, event.data.object);
        break;

      case 'transfer.failed':
        await handleTransferFailed(c.env, event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(c.env, event.data.object);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

async function handlePaymentSucceeded(env: Env, paymentIntent: any): Promise<void> {
  const { id, metadata } = paymentIntent;
  const jobId = metadata?.job_id;

  if (!jobId) {
    console.error('Payment intent missing job_id metadata:', id);
    return;
  }

  // Update job payment status
  await updatePaymentStatus(env.DB, jobId, 'paid', id);

  // Get job details
  const job = await getJobById(env.DB, jobId);
  if (!job || !job.worker_id) {
    console.error('Job not found or no worker:', jobId);
    return;
  }

  // Calculate and create earnings record
  const amount = job.price_final || job.price_accepted || job.price_offered || 0;
  const fees = calculateFees(amount);

  await createEarning(env.DB, {
    user_id: job.worker_id,
    job_id: job.id,
    gross_amount: amount,
    platform_fee: fees.platform_fee,
    future_fund_contribution: fees.future_fund,
    net_amount: fees.net_amount,
    payment_method: 'stripe',
    stripe_transfer_id: undefined, // Will be updated when transfer completes
  });

  // Notify worker of payment
  await sendPushNotification(env, job.worker_id, {
    title: 'Payment Received!',
    body: `$${fees.net_amount.toFixed(2)} has been received for your completed job.`,
    icon: '/icons/icon-192.png',
    url: `/worker/earnings`,
    data: { type: 'payment_received', job_id: jobId },
  });

  // Notify homeowner of successful payment
  await sendPushNotification(env, job.homeowner_id, {
    title: 'Payment Processed',
    body: `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
    icon: '/icons/icon-192.png',
    url: `/jobs/${jobId}`,
    data: { type: 'payment_processed', job_id: jobId },
  });
}

async function handlePaymentFailed(env: Env, paymentIntent: any): Promise<void> {
  const { id, metadata, last_payment_error } = paymentIntent;
  const jobId = metadata?.job_id;

  if (!jobId) {
    console.error('Payment intent missing job_id metadata:', id);
    return;
  }

  // Update job payment status
  await updatePaymentStatus(env.DB, jobId, 'failed', id);

  // Get job details
  const job = await getJobById(env.DB, jobId);
  if (!job) {
    console.error('Job not found:', jobId);
    return;
  }

  // Notify homeowner of failed payment
  await sendPushNotification(env, job.homeowner_id, {
    title: 'Payment Failed',
    body: last_payment_error?.message || 'Your payment could not be processed. Please update your payment method.',
    icon: '/icons/icon-192.png',
    url: `/jobs/${jobId}`,
    data: { type: 'payment_failed', job_id: jobId },
  });
}

async function handleTransferCreated(env: Env, transfer: any): Promise<void> {
  const { id, metadata } = transfer;
  const earningId = metadata?.earning_id;

  if (!earningId) {
    console.log('Transfer without earning_id metadata:', id);
    return;
  }

  await updateEarningStatus(env.DB, earningId, 'completed', id);
}

async function handleTransferFailed(env: Env, transfer: any): Promise<void> {
  const { id, metadata } = transfer;
  const earningId = metadata?.earning_id;

  if (!earningId) {
    console.log('Transfer without earning_id metadata:', id);
    return;
  }

  await updateEarningStatus(env.DB, earningId, 'failed', id);
}

async function handleAccountUpdated(env: Env, account: any): Promise<void> {
  const { id, payouts_enabled, charges_enabled } = account;

  // Update user's Stripe Connect status
  if (payouts_enabled && charges_enabled) {
    await env.DB.prepare(`
      UPDATE users SET updated_at = ? WHERE stripe_connect_id = ?
    `).bind(now(), id).run();

    console.log('Stripe Connect account fully enabled:', id);
  }
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts['t'];
    const expectedSig = parts['v1'];

    if (!timestamp || !expectedSig) {
      return false;
    }

    // Check timestamp is within tolerance (5 minutes)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 300000) {
      console.error('Webhook timestamp too old');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    const computedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSig === expectedSig;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export default stripeWebhook;
