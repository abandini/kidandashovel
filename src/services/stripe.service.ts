// Stripe payment service for A Kid and a Shovel

import type { Env, Job, User } from '../types';
import { updateUser } from '../db/queries/users';
import { updatePaymentStatus } from '../db/queries/jobs';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

interface StripeRequestOptions {
  method: 'GET' | 'POST' | 'DELETE';
  endpoint: string;
  body?: Record<string, any>;
  secretKey: string;
}

async function stripeRequest<T>(options: StripeRequestOptions): Promise<T> {
  const { method, endpoint, body, secretKey } = options;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  let requestBody: string | undefined;
  if (body) {
    requestBody = new URLSearchParams(flattenObject(body)).toString();
  }

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
    method,
    headers,
    body: requestBody,
  });

  const data = await response.json() as T;

  if (!response.ok) {
    throw new Error((data as any).error?.message || 'Stripe API error');
  }

  return data;
}

function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}[${key}]` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenObject(item, `${newKey}[${index}]`));
        } else {
          result[`${newKey}[${index}]`] = String(item);
        }
      });
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

// Customer management
export async function createCustomer(
  env: Env,
  user: User
): Promise<string> {
  const customer = await stripeRequest<{ id: string }>({
    method: 'POST',
    endpoint: '/customers',
    body: {
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      metadata: {
        user_id: user.id,
        user_type: user.type,
      },
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  // Update user with Stripe customer ID
  await updateUser(env.DB, user.id, { stripe_customer_id: customer.id });

  return customer.id;
}

export async function getOrCreateCustomer(
  env: Env,
  user: User
): Promise<string> {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }
  return createCustomer(env, user);
}

// Payment Intent for job payments
export async function createPaymentIntent(
  env: Env,
  job: Job,
  homeowner: User,
  worker: User,
  amount: number
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const customerId = await getOrCreateCustomer(env, homeowner);

  // Calculate platform fee (10% total: 7% platform, 3% future fund)
  const platformFee = Math.round(amount * 0.10 * 100); // in cents
  const amountCents = Math.round(amount * 100);

  const paymentIntent = await stripeRequest<{
    id: string;
    client_secret: string;
  }>({
    method: 'POST',
    endpoint: '/payment_intents',
    body: {
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      description: `Snow removal job #${job.id}`,
      metadata: {
        job_id: job.id,
        homeowner_id: homeowner.id,
        worker_id: worker.id,
        service_type: job.service_type,
      },
      // If worker has Stripe Connect, set up transfer
      ...(worker.stripe_connect_id && {
        transfer_data: {
          destination: worker.stripe_connect_id,
          amount: amountCents - platformFee,
        },
      }),
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  // Update job with payment intent ID
  await updatePaymentStatus(env.DB, job.id, 'processing', paymentIntent.id);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

// Stripe Connect for teen workers (via parent account)
export async function createConnectAccountLink(
  env: Env,
  user: User,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  // Create or get Connect account
  let accountId = user.stripe_connect_id;

  if (!accountId) {
    const account = await stripeRequest<{ id: string }>({
      method: 'POST',
      endpoint: '/accounts',
      body: {
        type: 'express',
        email: user.email,
        metadata: {
          user_id: user.id,
          user_type: user.type,
        },
        capabilities: {
          transfers: { requested: true },
        },
      },
      secretKey: env.STRIPE_SECRET_KEY,
    });

    accountId = account.id;
    await updateUser(env.DB, user.id, { stripe_connect_id: accountId });
  }

  // Create account link for onboarding
  const accountLink = await stripeRequest<{ url: string }>({
    method: 'POST',
    endpoint: '/account_links',
    body: {
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return accountLink.url;
}

// Check Connect account status
export async function getConnectAccountStatus(
  env: Env,
  accountId: string
): Promise<{
  payouts_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
}> {
  const account = await stripeRequest<{
    payouts_enabled: boolean;
    charges_enabled: boolean;
    details_submitted: boolean;
  }>({
    method: 'GET',
    endpoint: `/accounts/${accountId}`,
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return {
    payouts_enabled: account.payouts_enabled,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
  };
}

// Create a transfer to worker
export async function createTransfer(
  env: Env,
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string>
): Promise<string> {
  const transfer = await stripeRequest<{ id: string }>({
    method: 'POST',
    endpoint: '/transfers',
    body: {
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: destinationAccountId,
      metadata,
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return transfer.id;
}

// Get payment methods for customer
export async function getPaymentMethods(
  env: Env,
  customerId: string
): Promise<Array<{
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}>> {
  const response = await stripeRequest<{
    data: Array<{
      id: string;
      type: string;
      card?: {
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
      };
    }>;
  }>({
    method: 'GET',
    endpoint: `/payment_methods?customer=${customerId}&type=card`,
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return response.data;
}

// Create setup intent for saving payment method
export async function createSetupIntent(
  env: Env,
  customerId: string
): Promise<{ clientSecret: string }> {
  const setupIntent = await stripeRequest<{ client_secret: string }>({
    method: 'POST',
    endpoint: '/setup_intents',
    body: {
      customer: customerId,
      payment_method_types: ['card'],
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return { clientSecret: setupIntent.client_secret };
}

// Refund a payment
export async function refundPayment(
  env: Env,
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<string> {
  const refund = await stripeRequest<{ id: string }>({
    method: 'POST',
    endpoint: '/refunds',
    body: {
      payment_intent: paymentIntentId,
      ...(amount && { amount: Math.round(amount * 100) }),
      ...(reason && { reason }),
    },
    secretKey: env.STRIPE_SECRET_KEY,
  });

  return refund.id;
}
