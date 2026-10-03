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

export function calculateUnsimplifiedSettlements(
  expenses: any[],
  payments: any[]
): Settlement[] {
  const pairwise: Record<string, Record<string, number>> = {};

  const addDebt = (from: string, to: string, amount: number) => {
    if (from === to) return;
    if (!pairwise[from]) pairwise[from] = {};
    pairwise[from][to] = (pairwise[from][to] || 0) + amount;
  };

  expenses.forEach((exp) => {
    const payer = exp.payerId;
    exp.participants.forEach((p: any) => {
      if (p.userId !== payer) {
        addDebt(p.userId, payer, p.calculatedAmount);
      }
    });
  });

  payments.forEach((pay) => {
    addDebt(pay.fromUserId, pay.toUserId, -pay.amount);
  });

  const settlements: Settlement[] = [];

  // Net out the pairwise debts (if A owes B 100 and B owes A 60, A owes B 40)
  const processed = new Set<string>();
  Object.keys(pairwise).forEach((userA) => {
    Object.keys(pairwise[userA]).forEach((userB) => {
      const pairKey = [userA, userB].sort().join('-');
      if (processed.has(pairKey)) return;
      processed.add(pairKey);

      const aOwesB = pairwise[userA][userB] || 0;
      const bOwesA = (pairwise[userB] && pairwise[userB][userA]) || 0;

      const net = aOwesB - bOwesA;

      if (net > 0.01) {
        settlements.push({ from: userA, to: userB, amount: Number(net.toFixed(2)) });
      } else if (net < -0.01) {
        settlements.push({ from: userB, to: userA, amount: Number((-net).toFixed(2)) });
      }
    });
  });

  return settlements;
}

