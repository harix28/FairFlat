import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

export const checkGroupMembership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const groupId = req.params.groupId || req.body.groupId;
  const userId = req.user?.userId;

  if (!groupId || !userId) {
     res.status(400).json({ error: 'Group ID and User ID are required' });
     return;
  }

  try {
    const member = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ error: 'Forbidden: You are not a member of this household' });
      return;
    }

    // Attach role to request for role-based auth later if needed
    (req as any).groupRole = member.role;
    next();
  } catch (error) {
    console.error('Group membership check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
