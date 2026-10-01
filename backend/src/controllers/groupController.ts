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
