import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get aggregated statistics for a group.
 */
export const getGroupStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const userId = req.user?.userId; // use userId (JWT claim)

    // Expenses total
    const expenses = await prisma.expense.aggregate({
      where: { groupId },
      _sum: { amount: true },
    });
    const totalExpenses = expenses._sum?.amount ?? 0;

    // Payments made by current user
    const payments = userId
      ? await prisma.payment.aggregate({
          where: { groupId, fromUserId: userId },
          _sum: { amount: true },
        })
      : null;
    const totalPaid = payments?._sum?.amount ?? 0;

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

    // Shopping items count (purchased)
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: { groupId, status: 'purchased' },
    });
    const totalShoppingSpend = shoppingItems.reduce(
      (sum, item) => sum + (item.quantity ?? 1),
      0
    );

    // Expense trend per month (last 12 months)
    const expenseTrendRaw = await prisma.expense.groupBy({
      by: ['createdAt'],
      where: { groupId },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendMap: Record<string, number> = {};
    expenseTrendRaw.forEach((row) => {
      const date = new Date(row.createdAt);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      trendMap[month] = (trendMap[month] ?? 0) + (row._sum?.amount ?? 0);
    });
    const expenseTrend = Object.entries(trendMap).map(([month, amount]) => ({ month, amount }));

    // Household Contributions Leaderboard
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } }
    });

    const memberContributions = await Promise.all(
      groupMembers.map(async (member) => {
        const choresDone = await prisma.choreAssignment.count({
          where: { userId: member.userId, status: 'completed', chore: { groupId } }
        });
        const itemsBought = await prisma.shoppingItem.count({
          where: { groupId, status: 'purchased', purchasedBy: member.userId }
        });
        const expensesPaid = await prisma.expense.count({
          where: { groupId, payerId: member.userId }
        });

        return {
          userId: member.userId,
          name: member.user.name,
          choresDone,
          itemsBought,
          expensesPaid,
          score: (choresDone * 10) + (itemsBought * 5) + (expensesPaid * 2) // arbitrary fun score
        };
      })
    );
    
    // Sort by score descending
    memberContributions.sort((a, b) => b.score - a.score);

    res.json({
      totalExpenses,
      totalPaid,
      totalChores,
      completedChores,
      totalShoppingSpend,
      expenseTrend,
      memberContributions,
    });
  } catch (error: any) {
    console.error('Error fetching group stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
