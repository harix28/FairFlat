import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { calculateFairness, ExpenseInput, SplitType } from '../algorithms/fairnessEngine';
import { AuthRequest } from '../middleware/auth';
import { createAndEmitNotification } from './notificationController';

export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const { 
      amount, 
      title, 
      category, 
      splitType, 
      participants, 
      items, 
      tax, 
      serviceCharge, 
      taxDistribution 
    } = req.body;
    
    // Ensure user is authenticated
    const payerId = req.user?.userId;

    if (!payerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. Calculate the fairness shares
    const expenseInput: ExpenseInput = {
      payerId,
      amount,
      splitType: splitType as SplitType,
      participants,
      items,
      tax,
      serviceCharge,
      taxDistribution
    };
    
    const fairnessResult = calculateFairness(expenseInput);

    // 2. Save everything to the database in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      // Create expense
      const newExpense = await tx.expense.create({
        data: {
          groupId,
          payerId,
          amount,
          title,
          category,
          splitType,
          tax,
          serviceCharge,
          taxDistribution
        }
      });

      // Add expense participants with their calculated shares
      for (const p of participants) {
        await tx.expenseParticipant.create({
          data: {
            expenseId: newExpense.id,
            userId: p.userId,
            share: p.share,
            calculatedAmount: fairnessResult[p.userId]
          }
        });
      }

      // Add items if itemized
      if (splitType === 'itemized' && items) {
        for (const item of items) {
          const newItem = await tx.expenseItem.create({
            data: {
              expenseId: newExpense.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1
            }
          });

          for (const itemParticipantId of item.participants) {
            await tx.itemParticipant.create({
              data: {
                expenseItemId: newItem.id,
                userId: itemParticipantId
              }
            });
          }
        }
      }

      return newExpense;
    });

    // Real-Time Notification via WebSockets
    if ((req as any).io) {
      (req as any).io.to(groupId).emit('new_expense', expense);

      // Notify participants
      const payer = await prisma.user.findUnique({ where: { id: payerId } });
      for (const p of participants) {
        if (p.userId !== payerId && fairnessResult[p.userId] > 0) {
          await createAndEmitNotification(
            (req as any).io,
            p.userId,
            'New Expense Added',
            `${payer?.name || 'Someone'} added "${title}". Your share is ₹${fairnessResult[p.userId].toFixed(2)}.`,
            'expense'
          );
        }
      }
    }

    res.status(201).json({ message: 'Expense created successfully', expense, fairnessResult });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    res.status(200).json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const expenseId = String(req.params.expenseId);
    const userId = req.user?.userId;

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Allow if they are the payer
    if (expense.payerId !== userId) {
      res.status(403).json({ error: 'Only the payer can delete this expense' });
      return;
    }

    await prisma.expense.delete({ where: { id: expenseId } });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('expense_deleted', expenseId);
    }

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
