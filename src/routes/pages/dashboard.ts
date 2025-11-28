// Dashboard pages for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { layout, renderStars, renderBadge } from '../../templates/layout';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';
import { getJobsByHomeowner, getJobsByWorker, countJobsByStatus } from '../../db/queries/jobs';
import { getHomeownerProfileByUserId, getTeenProfileByUserId } from '../../db/queries/users';
import { getEarningsSummary, getSavingsGoalsByUser } from '../../db/queries/earnings';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';

const dashboard = new Hono<{ Bindings: Env }>();

// Apply auth middleware
dashboard.use('*', authMiddleware());

// Homeowner dashboard
dashboard.get('/dashboard', requireAuth(), requireUserType('homeowner'), async (c) => {
  const user = getCurrentUser(c);
  const profile = await getHomeownerProfileByUserId(c.env.DB, user!.id);
  const jobs = await getJobsByHomeowner(c.env.DB, user!.id, undefined, 10);
  const counts = await countJobsByStatus(c.env.DB, user!.id, 'homeowner');

  const activeJobs = jobs.filter(j => !['completed', 'reviewed', 'cancelled'].includes(j.status));
  const completedJobs = counts.completed + counts.reviewed;

  const html = layout(`
    <div class="flex flex-between flex-center mb-4">
      <h1>Welcome, ${user!.name}</h1>
      <a href="/jobs/new" class="btn btn-primary">Post a Job</a>
    </div>

    <div class="grid grid-3 mb-4">
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${activeJobs.length}</div>
        <div class="text-light">Active Jobs</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${completedJobs}</div>
        <div class="text-light">Completed Jobs</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold;">${profile?.avg_rating?.toFixed(1) || 'N/A'}</div>
        <div class="text-light">Your Rating</div>
      </div>
    </div>

    ${activeJobs.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Active Jobs</h2>
          <a href="/jobs" class="btn btn-secondary btn-sm">View All</a>
        </div>
        ${activeJobs.map(job => `
          <div style="padding: 1rem 0; border-bottom: 1px solid var(--border);">
            <div class="flex flex-between flex-center">
              <div>
                <strong>${job.service_type}</strong>
                ${renderBadge(job.status)}
              </div>
              <a href="/jobs/${job.id}" class="btn btn-secondary btn-sm">View</a>
            </div>
            <div class="text-light" style="font-size: 0.875rem;">
              ${job.address} &middot; ${job.price_offered ? formatCurrency(job.price_offered) : 'Open offer'}
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="card text-center" style="padding: 3rem;">
        <h3>No Active Jobs</h3>
        <p class="text-light mt-1">Post a job to find a worker for your snow removal needs.</p>
        <a href="/jobs/new" class="btn btn-primary mt-2">Post Your First Job</a>
      </div>
    `}

    <div class="grid grid-2 mt-4">
      <div class="card">
        <h3 class="mb-2">Quick Actions</h3>
        <a href="/jobs/new" class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;">Post a Job</a>
        <a href="/workers" class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;">Browse Workers</a>
        <a href="/settings" class="btn btn-secondary" style="width: 100%;">Account Settings</a>
      </div>
      <div class="card">
        <h3 class="mb-2">Weather Alert</h3>
        <p class="text-light">We'll notify you when snow is in the forecast so you can post jobs early.</p>
        <p class="mt-2"><a href="/settings#notifications">Manage notifications →</a></p>
      </div>
    </div>
  `, { title: 'Dashboard - A Kid and a Shovel', user });

  return c.html(html);
});

// Worker dashboard
dashboard.get('/worker/dashboard', requireAuth(), requireUserType('teen'), async (c) => {
  const user = getCurrentUser(c);
  const profile = await getTeenProfileByUserId(c.env.DB, user!.id);
  const jobs = await getJobsByWorker(c.env.DB, user!.id, undefined, 10);
  const earnings = await getEarningsSummary(c.env.DB, user!.id);
  const goals = await getSavingsGoalsByUser(c.env.DB, user!.id);
  const counts = await countJobsByStatus(c.env.DB, user!.id, 'worker');

  const activeJobs = jobs.filter(j => !['completed', 'reviewed', 'cancelled'].includes(j.status));
  const needsConsent = !profile?.verified;
  const consentPending = c.req.query('consent') === 'pending';

  const html = layout(`
    <div class="flex flex-between flex-center mb-4">
      <h1>Welcome, ${user!.name}</h1>
      <div class="flex gap-1">
        ${profile?.verified ? `
          <button onclick="toggleAvailability()" class="btn ${profile.available_now ? 'btn-success' : 'btn-secondary'}">
            ${profile.available_now ? '✓ Available' : 'Mark Available'}
          </button>
        ` : ''}
        <a href="/worker/jobs" class="btn btn-primary">Find Jobs</a>
      </div>
    </div>

    ${needsConsent ? `
      <div class="card" style="background: #fef3c7; border: 1px solid #f59e0b;">
        <h3>Parent Consent Required</h3>
        <p class="mt-1">To start accepting jobs, your parent or guardian needs to approve your account.</p>
        <p class="mt-1 text-light">We've sent an email to your parent. Ask them to check their inbox!</p>
        <a href="/api/consent/status" class="btn btn-secondary mt-2">Check Status</a>
      </div>
    ` : ''}

    <div class="grid grid-3 mb-4">
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${formatCurrency(earnings.this_week)}</div>
        <div class="text-light">This Week</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${counts.reviewed}</div>
        <div class="text-light">Jobs Completed</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold;">${profile?.avg_rating?.toFixed(1) || 'N/A'}</div>
        <div class="text-light">Your Rating</div>
      </div>
    </div>

    ${activeJobs.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Active Jobs</h2>
          <a href="/worker/my-jobs" class="btn btn-secondary btn-sm">View All</a>
        </div>
        ${activeJobs.map(job => `
          <div style="padding: 1rem 0; border-bottom: 1px solid var(--border);">
            <div class="flex flex-between flex-center">
              <div>
                <strong>${job.service_type}</strong>
                ${renderBadge(job.status)}
              </div>
              <a href="/worker/jobs/${job.id}" class="btn btn-secondary btn-sm">View</a>
            </div>
            <div class="text-light" style="font-size: 0.875rem;">
              ${job.address} &middot; ${job.price_accepted || job.price_offered ? formatCurrency(job.price_accepted || job.price_offered!) : 'TBD'}
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="card text-center" style="padding: 3rem;">
        <h3>No Active Jobs</h3>
        <p class="text-light mt-1">Browse available jobs in your area to get started.</p>
        <a href="/worker/jobs" class="btn btn-primary mt-2">Find Jobs</a>
      </div>
    `}

    <div class="grid grid-2 mt-4">
      <div class="card">
        <h3 class="mb-2">Earnings</h3>
        <div class="flex flex-between mb-2">
          <span>This Month</span>
          <strong>${formatCurrency(earnings.this_month)}</strong>
        </div>
        <div class="flex flex-between mb-2">
          <span>All Time</span>
          <strong>${formatCurrency(earnings.total_earned)}</strong>
        </div>
        <div class="flex flex-between" style="border-top: 1px solid var(--border); padding-top: 0.5rem;">
          <span>Future Fund</span>
          <strong style="color: var(--success);">${formatCurrency(earnings.future_fund_balance)}</strong>
        </div>
        <a href="/worker/earnings" class="btn btn-secondary btn-sm mt-2" style="width: 100%;">View Details</a>
      </div>

      <div class="card">
        <h3 class="mb-2">Savings Goals</h3>
        ${goals.length > 0 ? goals.slice(0, 2).map(goal => `
          <div class="mb-2">
            <div class="flex flex-between">
              <span>${goal.name}</span>
              <span>${Math.round((goal.current_amount / goal.target_amount) * 100)}%</span>
            </div>
            <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: var(--primary); height: 100%; width: ${Math.min(100, (goal.current_amount / goal.target_amount) * 100)}%;"></div>
            </div>
          </div>
        `).join('') : `
          <p class="text-light">No savings goals yet. Set goals to track your progress!</p>
        `}
        <a href="/worker/goals" class="btn btn-secondary btn-sm mt-2" style="width: 100%;">Manage Goals</a>
      </div>
    </div>

    <script>
      async function toggleAvailability() {
        try {
          const res = await fetch('/api/workers/me/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: ${!profile?.available_now} })
          });
          if (res.ok) {
            window.location.reload();
          }
        } catch (err) {
          console.error(err);
        }
      }
    </script>
  `, { title: 'Worker Dashboard - A Kid and a Shovel', user });

  return c.html(html);
});

// Worker earnings page
dashboard.get('/worker/earnings', requireAuth(), requireUserType('teen'), async (c) => {
  const user = getCurrentUser(c);
  const earnings = await getEarningsSummary(c.env.DB, user!.id);

  const html = layout(`
    <h1 class="mb-4">Your Earnings</h1>

    <div class="grid grid-3 mb-4">
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${formatCurrency(earnings.this_week)}</div>
        <div class="text-light">This Week</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold;">${formatCurrency(earnings.this_month)}</div>
        <div class="text-light">This Month</div>
      </div>
      <div class="card text-center">
        <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${formatCurrency(earnings.total_earned)}</div>
        <div class="text-light">All Time</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 class="mb-2">Future Fund</h3>
        <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${formatCurrency(earnings.future_fund_balance)}</div>
        <p class="text-light mt-1">This is 3% of your earnings set aside for your future.</p>

        <div class="mt-4">
          <h4>What Could This Become?</h4>
          <p class="text-light">If invested at 7% annual return:</p>
          <ul style="list-style: none; margin-top: 0.5rem;">
            <li>In 5 years: <strong>${formatCurrency(earnings.future_fund_balance * Math.pow(1.07, 5))}</strong></li>
            <li>In 10 years: <strong>${formatCurrency(earnings.future_fund_projected)}</strong></li>
            <li>By age 25: <strong>${formatCurrency(earnings.future_fund_balance * Math.pow(1.07, 25 - 16))}</strong></li>
          </ul>
        </div>

        <a href="/worker/learn" class="btn btn-secondary mt-2">Learn About Investing →</a>
      </div>

      <div class="card">
        <h3 class="mb-2">Statistics</h3>
        <div class="flex flex-between mb-2">
          <span>Jobs Completed</span>
          <strong>${earnings.jobs_completed}</strong>
        </div>
        <div class="flex flex-between mb-2">
          <span>Average Per Job</span>
          <strong>${formatCurrency(earnings.average_per_job)}</strong>
        </div>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 1rem 0;">
        <h4>How Earnings Work</h4>
        <p class="text-light" style="font-size: 0.875rem;">
          When paid via card:<br>
          • 90% goes to you<br>
          • 7% platform fee<br>
          • 3% to your Future Fund
        </p>
        <p class="text-light mt-1" style="font-size: 0.875rem;">
          Cash payments: 100% goes to you directly.
        </p>
      </div>
    </div>
  `, { title: 'Earnings - A Kid and a Shovel', user });

  return c.html(html);
});

export default dashboard;
