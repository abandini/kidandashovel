// Earnings API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { validateSavingsGoal } from '../../utils/validation';
import { projectGrowth, formatCurrency } from '../../utils/helpers';
import {
  getEarningsByUser,
  getEarningsSummary,
  getWeeklyEarnings,
  getMonthlyEarnings,
  createSavingsGoal,
  getSavingsGoalsByUser,
  getSavingsGoalById,
  updateSavingsGoal,
  addToSavingsGoal,
  deleteSavingsGoal,
  getGoalProgress,
} from '../../db/queries/earnings';
import { authMiddleware, requireAuth, requireUserType, getCurrentUser } from '../../middleware/auth';

const earnings = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
earnings.use('*', authMiddleware());

// Get earnings summary
earnings.get('/summary', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const summary = await getEarningsSummary(c.env.DB, user!.id);

    return c.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    return c.json({ success: false, error: 'Failed to get earnings summary' }, 500);
  }
});

// Get earnings history
earnings.get('/history', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { limit, offset } = c.req.query();

    const earningsList = await getEarningsByUser(
      c.env.DB,
      user!.id,
      parseInt(limit) || 50,
      parseInt(offset) || 0
    );

    return c.json({
      success: true,
      data: earningsList,
    });
  } catch (error) {
    console.error('Get earnings history error:', error);
    return c.json({ success: false, error: 'Failed to get earnings history' }, 500);
  }
});

// Get weekly earnings chart data
earnings.get('/chart/weekly', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { weeks } = c.req.query();

    const data = await getWeeklyEarnings(c.env.DB, user!.id, parseInt(weeks) || 12);

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get weekly earnings error:', error);
    return c.json({ success: false, error: 'Failed to get weekly earnings' }, 500);
  }
});

// Get monthly earnings chart data
earnings.get('/chart/monthly', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { months } = c.req.query();

    const data = await getMonthlyEarnings(c.env.DB, user!.id, parseInt(months) || 12);

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get monthly earnings error:', error);
    return c.json({ success: false, error: 'Failed to get monthly earnings' }, 500);
  }
});

// Compound interest calculator
earnings.get('/calculator', requireAuth(), async (c) => {
  try {
    const { principal, years, rate } = c.req.query();

    const principalAmount = parseFloat(principal) || 0;
    const yearsNum = parseInt(years) || 10;
    const rateNum = parseFloat(rate) || 0.07;

    if (principalAmount < 0 || yearsNum < 1 || yearsNum > 50) {
      return c.json({ success: false, error: 'Invalid calculator parameters' }, 400);
    }

    const projections = [];
    for (let year = 1; year <= yearsNum; year++) {
      projections.push({
        year,
        value: Math.round(projectGrowth(principalAmount, year, rateNum) * 100) / 100,
      });
    }

    const finalValue = projectGrowth(principalAmount, yearsNum, rateNum);
    const totalGrowth = finalValue - principalAmount;
    const percentageGrowth = principalAmount > 0 ? ((finalValue / principalAmount) - 1) * 100 : 0;

    return c.json({
      success: true,
      data: {
        principal: principalAmount,
        years: yearsNum,
        rate: rateNum,
        final_value: Math.round(finalValue * 100) / 100,
        total_growth: Math.round(totalGrowth * 100) / 100,
        percentage_growth: Math.round(percentageGrowth * 10) / 10,
        projections,
      },
    });
  } catch (error) {
    console.error('Calculator error:', error);
    return c.json({ success: false, error: 'Calculator failed' }, 500);
  }
});

// === Savings Goals ===

// Get all savings goals
earnings.get('/goals', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const goals = await getSavingsGoalsByUser(c.env.DB, user!.id);
    const progress = await getGoalProgress(c.env.DB, user!.id);

    return c.json({
      success: true,
      data: {
        goals,
        progress,
      },
    });
  } catch (error) {
    console.error('Get savings goals error:', error);
    return c.json({ success: false, error: 'Failed to get savings goals' }, 500);
  }
});

// Create savings goal
earnings.post('/goals', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const body = await c.req.json();

    const validation = validateSavingsGoal({
      name: body.name,
      target_amount: body.target_amount,
      target_date: body.target_date,
    });

    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    const goal = await createSavingsGoal(c.env.DB, {
      user_id: user!.id,
      name: body.name,
      description: body.description,
      target_amount: body.target_amount,
      target_date: body.target_date,
      priority: body.priority || 0,
    });

    return c.json({ success: true, data: goal }, 201);
  } catch (error) {
    console.error('Create savings goal error:', error);
    return c.json({ success: false, error: 'Failed to create savings goal' }, 500);
  }
});

// Get single savings goal
earnings.get('/goals/:id', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    const goal = await getSavingsGoalById(c.env.DB, id);
    if (!goal) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }

    if (goal.user_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    return c.json({ success: true, data: goal });
  } catch (error) {
    console.error('Get savings goal error:', error);
    return c.json({ success: false, error: 'Failed to get savings goal' }, 500);
  }
});

// Update savings goal
earnings.patch('/goals/:id', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const body = await c.req.json();

    const goal = await getSavingsGoalById(c.env.DB, id);
    if (!goal) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }

    if (goal.user_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const validation = validateSavingsGoal({
      name: body.name,
      target_amount: body.target_amount,
      target_date: body.target_date,
    });

    if (!validation.valid) {
      return c.json({ success: false, errors: validation.errors }, 400);
    }

    await updateSavingsGoal(c.env.DB, id, {
      name: body.name,
      description: body.description,
      target_amount: body.target_amount,
      target_date: body.target_date,
      priority: body.priority,
    });

    const updatedGoal = await getSavingsGoalById(c.env.DB, id);

    return c.json({ success: true, data: updatedGoal });
  } catch (error) {
    console.error('Update savings goal error:', error);
    return c.json({ success: false, error: 'Failed to update savings goal' }, 500);
  }
});

// Add money to savings goal
earnings.post('/goals/:id/add', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();
    const { amount } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ success: false, error: 'Valid amount is required' }, 400);
    }

    const goal = await getSavingsGoalById(c.env.DB, id);
    if (!goal) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }

    if (goal.user_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const updatedGoal = await addToSavingsGoal(c.env.DB, id, amount);

    return c.json({
      success: true,
      data: updatedGoal,
      message: updatedGoal?.achieved
        ? `Congratulations! You've reached your goal of ${formatCurrency(goal.target_amount)}!`
        : `Added ${formatCurrency(amount)} to your goal`,
    });
  } catch (error) {
    console.error('Add to savings goal error:', error);
    return c.json({ success: false, error: 'Failed to add to savings goal' }, 500);
  }
});

// Delete savings goal
earnings.delete('/goals/:id', requireAuth(), requireUserType('teen'), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { id } = c.req.param();

    const goal = await getSavingsGoalById(c.env.DB, id);
    if (!goal) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }

    if (goal.user_id !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    await deleteSavingsGoal(c.env.DB, id);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete savings goal error:', error);
    return c.json({ success: false, error: 'Failed to delete savings goal' }, 500);
  }
});

export default earnings;
