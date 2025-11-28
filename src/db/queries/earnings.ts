// Earnings database queries for A Kid and a Shovel

import type { Earnings, EarningsSummary, SavingsGoal } from '../../types';
import { generateId, now, projectGrowth } from '../../utils/helpers';

// Earnings queries
export async function createEarning(
  db: D1Database,
  data: Omit<Earnings, 'id' | 'created_at' | 'status'>
): Promise<Earnings> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO earnings (
      id, user_id, job_id, gross_amount, platform_fee, future_fund_contribution,
      net_amount, payment_method, stripe_transfer_id, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    id,
    data.user_id,
    data.job_id,
    data.gross_amount,
    data.platform_fee,
    data.future_fund_contribution,
    data.net_amount,
    data.payment_method,
    data.stripe_transfer_id || null,
    data.notes || null,
    timestamp
  ).run();

  // Update teen's total earnings and future fund balance
  await db.prepare(`
    UPDATE teen_profiles
    SET total_earnings = total_earnings + ?,
        future_fund_balance = future_fund_balance + ?,
        completed_jobs_count = completed_jobs_count + 1,
        updated_at = ?
    WHERE user_id = ?
  `).bind(data.net_amount, data.future_fund_contribution, timestamp, data.user_id).run();

  return {
    ...data,
    id,
    status: 'pending',
    created_at: timestamp,
  };
}

export async function updateEarningStatus(
  db: D1Database,
  id: string,
  status: 'pending' | 'completed' | 'failed',
  stripeTransferId?: string
): Promise<void> {
  await db.prepare(`
    UPDATE earnings
    SET status = ?, stripe_transfer_id = COALESCE(?, stripe_transfer_id)
    WHERE id = ?
  `).bind(status, stripeTransferId || null, id).run();
}

export async function getEarningsByUser(
  db: D1Database,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Earnings[]> {
  const results = await db.prepare(`
    SELECT * FROM earnings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(userId, limit, offset).all();

  return (results.results || []) as unknown as Earnings[];
}

export async function getEarningsSummary(
  db: D1Database,
  userId: string
): Promise<EarningsSummary> {
  // Get all-time totals
  const allTime = await db.prepare(`
    SELECT
      SUM(net_amount) as total_earned,
      COUNT(*) as jobs_completed,
      AVG(net_amount) as average_per_job
    FROM earnings
    WHERE user_id = ? AND status = 'completed'
  `).bind(userId).first<{
    total_earned: number;
    jobs_completed: number;
    average_per_job: number;
  }>();

  // Get this month's earnings
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonth = await db.prepare(`
    SELECT SUM(net_amount) as total
    FROM earnings
    WHERE user_id = ? AND status = 'completed' AND created_at >= ?
  `).bind(userId, startOfMonth.toISOString()).first<{ total: number }>();

  // Get this week's earnings
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeek = await db.prepare(`
    SELECT SUM(net_amount) as total
    FROM earnings
    WHERE user_id = ? AND status = 'completed' AND created_at >= ?
  `).bind(userId, startOfWeek.toISOString()).first<{ total: number }>();

  // Get future fund balance from teen profile
  const profile = await db.prepare(`
    SELECT future_fund_balance FROM teen_profiles WHERE user_id = ?
  `).bind(userId).first<{ future_fund_balance: number }>();

  const futureFundBalance = profile?.future_fund_balance || 0;
  // Project growth at 7% for 10 years (until they're ~25)
  const futureFundProjected = projectGrowth(futureFundBalance, 10, 0.07);

  return {
    total_earned: allTime?.total_earned || 0,
    this_month: thisMonth?.total || 0,
    this_week: thisWeek?.total || 0,
    jobs_completed: allTime?.jobs_completed || 0,
    average_per_job: allTime?.average_per_job || 0,
    future_fund_balance: futureFundBalance,
    future_fund_projected: Math.round(futureFundProjected * 100) / 100,
  };
}

export async function getWeeklyEarnings(
  db: D1Database,
  userId: string,
  weeks: number = 12
): Promise<{ week_start: string; amount: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const results = await db.prepare(`
    SELECT
      date(created_at, 'weekday 0', '-6 days') as week_start,
      SUM(net_amount) as amount
    FROM earnings
    WHERE user_id = ? AND status = 'completed' AND created_at >= ?
    GROUP BY week_start
    ORDER BY week_start ASC
  `).bind(userId, startDate.toISOString()).all();

  return (results.results || []) as { week_start: string; amount: number }[];
}

export async function getMonthlyEarnings(
  db: D1Database,
  userId: string,
  months: number = 12
): Promise<{ month: string; amount: number }[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const results = await db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      SUM(net_amount) as amount
    FROM earnings
    WHERE user_id = ? AND status = 'completed' AND created_at >= ?
    GROUP BY month
    ORDER BY month ASC
  `).bind(userId, startDate.toISOString()).all();

  return (results.results || []) as { month: string; amount: number }[];
}

// Savings goals queries
export async function createSavingsGoal(
  db: D1Database,
  data: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at' | 'achieved' | 'achieved_at' | 'current_amount'>
): Promise<SavingsGoal> {
  const id = generateId();
  const timestamp = now();

  await db.prepare(`
    INSERT INTO savings_goals (
      id, user_id, name, description, target_amount, current_amount,
      target_date, priority, achieved, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
  `).bind(
    id,
    data.user_id,
    data.name,
    data.description || null,
    data.target_amount,
    data.target_date || null,
    data.priority || 0,
    timestamp,
    timestamp
  ).run();

  return {
    ...data,
    id,
    current_amount: 0,
    achieved: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getSavingsGoalById(db: D1Database, id: string): Promise<SavingsGoal | null> {
  const result = await db.prepare(
    'SELECT * FROM savings_goals WHERE id = ?'
  ).bind(id).first();

  if (!result) return null;

  return {
    ...result,
    achieved: Boolean(result.achieved),
  } as SavingsGoal;
}

export async function getSavingsGoalsByUser(
  db: D1Database,
  userId: string
): Promise<SavingsGoal[]> {
  const results = await db.prepare(`
    SELECT * FROM savings_goals
    WHERE user_id = ?
    ORDER BY priority DESC, created_at DESC
  `).bind(userId).all();

  return (results.results || []).map(row => ({
    ...row,
    achieved: Boolean(row.achieved),
  })) as SavingsGoal[];
}

export async function updateSavingsGoal(
  db: D1Database,
  id: string,
  data: Partial<Pick<SavingsGoal, 'name' | 'description' | 'target_amount' | 'target_date' | 'priority'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value as string | number | null);
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(id);

  await db.prepare(
    `UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function addToSavingsGoal(
  db: D1Database,
  id: string,
  amount: number
): Promise<SavingsGoal | null> {
  const timestamp = now();

  await db.prepare(`
    UPDATE savings_goals
    SET current_amount = current_amount + ?, updated_at = ?
    WHERE id = ?
  `).bind(amount, timestamp, id).run();

  // Check if goal is now achieved
  const goal = await getSavingsGoalById(db, id);
  if (goal && goal.current_amount >= goal.target_amount && !goal.achieved) {
    await db.prepare(`
      UPDATE savings_goals
      SET achieved = 1, achieved_at = ?
      WHERE id = ?
    `).bind(timestamp, id).run();
    goal.achieved = true;
    goal.achieved_at = timestamp;
  }

  return goal;
}

export async function deleteSavingsGoal(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM savings_goals WHERE id = ?').bind(id).run();
}

export async function getGoalProgress(
  db: D1Database,
  userId: string
): Promise<{
  total_goals: number;
  achieved_goals: number;
  total_target: number;
  total_saved: number;
  overall_progress: number;
}> {
  const result = await db.prepare(`
    SELECT
      COUNT(*) as total_goals,
      SUM(CASE WHEN achieved = 1 THEN 1 ELSE 0 END) as achieved_goals,
      SUM(target_amount) as total_target,
      SUM(current_amount) as total_saved
    FROM savings_goals
    WHERE user_id = ?
  `).bind(userId).first<{
    total_goals: number;
    achieved_goals: number;
    total_target: number;
    total_saved: number;
  }>();

  const totalTarget = result?.total_target || 0;
  const totalSaved = result?.total_saved || 0;

  return {
    total_goals: result?.total_goals || 0,
    achieved_goals: result?.achieved_goals || 0,
    total_target: totalTarget,
    total_saved: totalSaved,
    overall_progress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
  };
}
