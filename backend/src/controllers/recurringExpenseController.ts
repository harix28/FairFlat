import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const createRecurringExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const { amount, title, category, splitType, interval, nextRun } = req.body;
    const payerId = req.user?.userId;

    if (!payerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        groupId,
        payerId,
        amount,
        title,
        category,
        splitType,
        interval,
        nextRun: new Date(nextRun),
      }
    });

    res.status(201).json(recurringExpense);
  } catch (error: any) {
    console.error('Create recurring expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupRecurringExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: { groupId }
    });

    res.status(200).json(recurringExpenses);
  } catch (error: any) {
    console.error('Get recurring expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
