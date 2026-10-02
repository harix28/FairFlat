import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    
    const [expenses, payments, chores, shopping] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId },
        include: { payer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.payment.findMany({
        where: { groupId },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.chore.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.shoppingItem.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    const feed = [
      ...expenses.map(e => ({
        id: `exp_${e.id}`,
        type: 'expense',
        title: `Added expense: ${e.title}`,
        subtitle: `${e.payer.name} paid ₹${e.amount}`,
        timestamp: e.createdAt
      })),
      ...payments.map(p => ({
        id: `pay_${p.id}`,
        type: 'payment',
        title: `Settled debt`,
        subtitle: `${p.fromUser.name} paid ${p.toUser.name} ₹${p.amount}`,
        timestamp: p.createdAt
      })),
      ...chores.map(c => ({
        id: `chr_${c.id}`,
        type: 'chore',
        title: `Added chore: ${c.title}`,
        subtitle: `Priority: ${c.priority}`,
        timestamp: c.createdAt
      })),
      ...shopping.map(s => ({
        id: `shp_${s.id}`,
        type: 'shopping',
        title: `Added to shopping list: ${s.name}`,
        subtitle: `Quantity: ${s.quantity}`,
        timestamp: s.createdAt
      }))
    ];

    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(feed.slice(0, 50));
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
