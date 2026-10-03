import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { calculateSettlements, Balance, calculateUnsimplifiedSettlements } from '../algorithms/settlementEngine';
import { AuthRequest } from '../middleware/auth';

export const getGroupBalancesAndSettlements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    
    // 1. Fetch all expenses in the group
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { participants: true }
    });
    
    // 2. Fetch all completed payments in the group
    const payments = await prisma.payment.findMany({
      where: { groupId, status: 'completed' }
    });
    
    // 3. Calculate running balance for each user
    const balances: Balance = {};
    
    // Helper to add balance
    const addBalance = (userId: string, amount: number) => {
      if (!balances[userId]) balances[userId] = 0;
      balances[userId] += amount;
    };
    
    // For each expense, the payer gets +(amount) credit, and each participant gets -(calculatedAmount) debt
    expenses.forEach(exp => {
      // Credit the payer
      addBalance(exp.payerId, exp.amount);
      
      // Debit the participants
      exp.participants.forEach(p => {
        addBalance(p.userId, -p.calculatedAmount);
      });
    });
    
    // For each payment, the sender gets +(amount) credit, receiver gets -(amount) debt
    payments.forEach(pay => {
      addBalance(pay.fromUserId, pay.amount);
      addBalance(pay.toUserId, -pay.amount);
    });
    
    // 4. Calculate optimized settlements (greedy simplification)
    const simplifiedSettlements = calculateSettlements(balances);

    // 5. Calculate unsimplified exact settlements
    const settlements = calculateUnsimplifiedSettlements(expenses, payments);
    
    res.status(200).json({ balances, settlements, simplifiedSettlements });
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
