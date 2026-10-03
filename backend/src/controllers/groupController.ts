import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

export const createGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!name || !userId) {
      res.status(400).json({ error: 'Group name is required' });
      return;
    }

    // Generate a unique invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await prisma.group.create({
      data: {
        name,
        inviteCode,
        members: {
          create: {
            userId,
            role: 'owner',
          }
        }
      },
      include: {
        members: true
      }
    });

    res.status(201).json(group);
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: { expenses: true }
        }
      }
    });

    res.status(200).json(groups);
  } catch (error: any) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?.userId;

    if (!inviteCode || !userId) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found or invalid invite code' });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: group.id
        }
      }
    });

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this group' });
      return;
    }

    const newMember = await prisma.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: 'member'
      }
    });

    res.status(200).json({ message: 'Successfully joined group', group });
  } catch (error: any) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!userId || !groupId || !name) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } }
    });

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { name }
    });

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const userId = req.user?.userId;

    if (!userId || !groupId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    // Calculate user's balance before allowing them to leave
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { participants: true }
    });
    
    const payments = await prisma.payment.findMany({
      where: { groupId, status: 'completed' }
    });
    
    let myBalance = 0;
    expenses.forEach(exp => {
      if (exp.payerId === userId) myBalance += exp.amount;
      const myPart = exp.participants.find(p => p.userId === userId);
      if (myPart) myBalance -= myPart.calculatedAmount;
    });
    payments.forEach(pay => {
      if (pay.fromUserId === userId) myBalance += pay.amount;
      if (pay.toUserId === userId) myBalance -= pay.amount;
    });

    if (Math.abs(myBalance) > 0.01) {
      res.status(400).json({ error: 'You cannot leave the group until all your balances are settled (₹' + myBalance.toFixed(2) + ').' });
      return;
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } }
    });

    res.status(200).json({ message: 'Left group successfully' });
  } catch (error: any) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
