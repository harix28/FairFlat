import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const sendReminder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.userId;
    const { targetUserId, amount } = req.body;

    if (!senderId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!targetUserId) {
      res.status(400).json({ error: 'Missing target user ID' });
      return;
    }

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Payment Reminder',
        message: `${sender?.name || 'Someone'} gently reminds you to settle your balance of ₹${amount}.`,
        type: 'settlement'
      }
    });

    res.status(200).json({ message: 'Reminder sent successfully' });
  } catch (error: any) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.notificationId as string;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized to update this notification' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
