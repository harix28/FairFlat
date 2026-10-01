export interface Balance {
  [userId: string]: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function calculateSettlements(balances: Balance): Settlement[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  // Separate into debtors (negative balance) and creditors (positive balance)
  Object.keys(balances).forEach(userId => {
    const amount = balances[userId];
    if (amount < -0.01) {
      debtors.push({ userId, amount: -amount });
    } else if (amount > 0.01) {
      creditors.push({ userId, amount });
    }
  });

  // Sort by amount descending to minimize transactions (greedy approach)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0.001) { // Floating point safety
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Number(amount.toFixed(2))
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return settlements;
}
