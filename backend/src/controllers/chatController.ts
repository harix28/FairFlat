import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    
    const messages = await prisma.message.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const userId = req.user?.userId;
    const { text } = req.body;

    if (!userId || !text) {
      res.status(400).json({ error: 'Missing user or text' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        groupId,
        userId,
        text
      },
      include: { user: { select: { id: true, name: true } } }
    });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageId = String(req.params.messageId);
    const groupId = String(req.params.groupId);
    const userId = req.user?.userId;
    
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (message.userId !== userId) {
      res.status(403).json({ error: 'Cannot delete someone else message' });
      return;
    }

    await prisma.message.delete({ where: { id: messageId } });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('message_deleted', messageId);
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
