import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Returns an array of each member's net balance within the group.
 * Response shape: { members: [{ userId: string, name: string, netBalance: number }] }
 */
export const getBalanceDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;

    // Fetch group members with user info
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Fetch expenses and payments to compute balances (same logic as settlementController)
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { participants: true },
    });
    const payments = await prisma.payment.findMany({
      where: { groupId, status: 'completed' },
    });

    const balances: Record<string, number> = {};
    const addBalance = (userId: string, amount: number) => {
      balances[userId] = (balances[userId] ?? 0) + amount;
    };

    // Expenses: payer gets credit, participants get debit of calculatedAmount
    expenses.forEach((exp) => {
      addBalance(exp.payerId, Number(exp.amount));
      exp.participants.forEach((p) => {
        addBalance(p.userId, -Number(p.calculatedAmount));
      });
    });

    // Payments: sender credit, receiver debit
    payments.forEach((pay) => {
      addBalance(pay.fromUserId, -Number(pay.amount));
      addBalance(pay.toUserId, Number(pay.amount));
    });

    const result = members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      netBalance: Number(balances[m.user.id] ?? 0),
    }));

    res.status(200).json({ members: result });
  } catch (error) {
    console.error('Error fetching balance details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
