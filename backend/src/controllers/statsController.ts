import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get aggregated statistics for a group.
 * Returns:
 *  - totalExpenses: sum of all expense amounts
 *  - totalPaid: sum of payments made by the current user (optional)
 *  - totalChores: total number of chores
 *  - completedChores: number of chores where all assignments are completed
 *  - totalShoppingSpend: sum of purchased shopping items' quantities * assumed price (if stored)
 *  - expenseTrend: array of { month: string, amount: number }
 */
export const getGroupStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user?.id;

    // Expenses total
    const expenses = await prisma.expense.aggregate({
      where: { groupId },
      _sum: { amount: true },
    });
    const totalExpenses = expenses._sum.amount ?? 0;

    // Payments made by current user (optional, for more detail)
    const payments = userId
      ? await prisma.payment.aggregate({
          where: { groupId, fromUserId: userId },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };
    const totalPaid = payments._sum.amount ?? 0;

    // Chores stats
    const totalChores = await prisma.chore.count({ where: { groupId } });
    const completedChores = await prisma.chore.count({
      where: {
        groupId,
        assignments: {
          every: { status: 'completed' },
        },
      },
    });

    // Shopping spend (sum of quantity * assumed price placeholder as price not stored)
    // If price is not stored, we just count items.
    const shoppingItems = await prisma.shoppingItem.findMany({ where: { groupId, status: 'purchased' } });
    const totalShoppingSpend = shoppingItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    // Expense trend per month (last 12 months)
    const expenseTrendRaw = await prisma.expense.groupBy({
      by: ['createdAt'],
      where: { groupId },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });
    // Transform to month strings and aggregate
    const trendMap: Record<string, number> = {};
    expenseTrendRaw.forEach((row) => {
      const date = new Date(row.createdAt);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      trendMap[month] = (trendMap[month] ?? 0) + (row._sum.amount ?? 0);
    });
    const expenseTrend = Object.entries(trendMap).map(([month, amount]) => ({ month, amount }));

    res.json({
      totalExpenses,
      totalPaid,
      totalChores,
      completedChores,
      totalShoppingSpend,
      expenseTrend,
    });
  } catch (error: any) {
    console.error('Error fetching group stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
