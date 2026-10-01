export type SplitType = 'equal' | 'percentage' | 'custom' | 'itemized' | 'usage';

export interface Participant {
  userId: string;
  share?: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  price: number;
  participants: string[];
}

export interface ExpenseInput {
  payerId: string;
  amount: number;
  participants: Participant[];
  splitType: SplitType;
  items?: ExpenseItem[];
  tax?: number;
  serviceCharge?: number;
  taxDistribution?: 'everyone' | 'item_participants' | 'proportional';
}

export interface FairnessResult {
  [userId: string]: number;
}

export function calculateFairness(expense: ExpenseInput): FairnessResult {
  const result: FairnessResult = {};
  
  expense.participants.forEach(p => {
    result[p.userId] = 0;
  });

  if (expense.splitType === 'equal') {
    const share = expense.amount / expense.participants.length;
    expense.participants.forEach(p => {
      result[p.userId] = Number(share.toFixed(2));
    });
    
    let sum = 0;
    Object.values(result).forEach(v => sum += v);
    if (Math.abs(sum - expense.amount) > 0.001) {
      const diff = expense.amount - sum;
      result[expense.participants[0].userId] += diff;
      result[expense.participants[0].userId] = Number(result[expense.participants[0].userId].toFixed(2));
    }
  } else if (expense.splitType === 'itemized' && expense.items) {
    let itemsTotal = 0;
    
    expense.items.forEach(item => {
      itemsTotal += item.price;
      if (item.participants.length > 0) {
        const itemShare = item.price / item.participants.length;
        item.participants.forEach(userId => {
          if (result[userId] === undefined) result[userId] = 0;
          result[userId] += itemShare;
        });
      }
    });
    
    const extras = (expense.tax || 0) + (expense.serviceCharge || 0);
    if (extras > 0) {
      if (expense.taxDistribution === 'everyone' || !expense.taxDistribution) {
        const extraShare = extras / expense.participants.length;
        expense.participants.forEach(p => {
          result[p.userId] += extraShare;
        });
      }
    }
    
    let sum = 0;
    Object.keys(result).forEach(k => {
      result[k] = Number(result[k].toFixed(2));
      sum += result[k];
    });
    
    const targetTotal = itemsTotal + extras;
    if (Math.abs(sum - targetTotal) > 0.001) {
      const diff = targetTotal - sum;
      const firstUserId = expense.participants[0]?.userId || Object.keys(result)[0];
      if (firstUserId) {
        result[firstUserId] = Number((result[firstUserId] + diff).toFixed(2));
      }
    }
  }
  return result;
}
