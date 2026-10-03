import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAndEmitNotification } from './notificationController';

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const { toUserId, amount } = req.body;
    const fromUserId = req.user?.userId;

    if (!fromUserId || !groupId || !toUserId || !amount) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (fromUserId === toUserId) {
      res.status(400).json({ error: 'Cannot pay yourself' });
      return;
    }

    // Verify group membership
    const groupMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: fromUserId,
          groupId
        }
      }
    });

    if (!groupMember) {
      res.status(403).json({ error: 'You are not a member of this group' });
      return;
    }

    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount,
        status: 'completed',
        date: new Date()
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } }
      }
    });

    // Option: Emit socket event here for real-time update
    const io = (req as any).io;
    if (io) {
      io.to(groupId).emit('payment_recorded', payment);
    }

    if (io) {
      await createAndEmitNotification(
        io,
        toUserId,
        'Payment Received',
        `${payment.fromUser.name} paid you ₹${amount}`,
        'settlement'
      );
    }

    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
