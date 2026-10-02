// Debt simplification algorithm – computes minimal set of payments to settle balances
// Returns an array of suggested payments: { from: string, to: string, amount: number }
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function computeDebtSimplification(groupId: string) {
  // 1. Get all users in the group
  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  const userIds = members.map(m => m.userId);

  // 2. Compute net balance per user from expenses and settled payments
  const expenses = await prisma.expense.findMany({ where: { groupId }, include: { participants: true, payer: true } });
  const payments = await prisma.payment.findMany({ where: { groupId } });

  const balances: Record<string, number> = {};
  userIds.forEach(id => (balances[id] = 0));

  // Expenses: payer gets credit, participants get debit (calculatedAmount already stored)
  for (const exp of expenses) {
    const total = Number(exp.amount);
    const payerId = exp.payerId;
    balances[payerId] = (balances[payerId] || 0) + total;
    for (const part of exp.participants) {
      const share = Number(part.calculatedAmount);
      balances[part.userId] = (balances[part.userId] || 0) - share;
    }
  }

  // Payments (settlements) adjust balances
  for (const pay of payments) {
    const amt = Number(pay.amount);
    balances[pay.fromUserId] = (balances[pay.fromUserId] || 0) - amt;
    balances[pay.toUserId] = (balances[pay.toUserId] || 0) + amt;
  }

  // 3. Separate creditors (positive) and debtors (negative)
  const creditors = [] as { userId: string; amount: number }[];
  const debtors = [] as { userId: string; amount: number }[];
  for (const [uid, bal] of Object.entries(balances)) {
    const rounded = Math.round(bal * 100) / 100; // two decimals
    if (rounded > 0.01) creditors.push({ userId: uid, amount: rounded });
    else if (rounded < -0.01) debtors.push({ userId: uid, amount: -rounded });
  }

  // Sort creditors descending, debtors descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggestions: { from: string; to: string; amount: number }[] = [];

  // Greedy settlement: debtors pay creditors
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = Math.min(debtor.amount, creditor.amount);
    suggestions.push({ from: debtor.userId, to: creditor.userId, amount: pay });
    debtor.amount -= pay;
    creditor.amount -= pay;
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return suggestions;
}
