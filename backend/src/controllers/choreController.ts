import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAndEmitNotification } from './notificationController';

export const createChore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const { title, description, frequency, priority, dueDate, assigneeIds } = req.body;
    
    const chore = await prisma.chore.create({
      data: {
        groupId,
        title,
        description,
        frequency: frequency || 'one-time',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      }
    });

    if (assigneeIds && assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        await prisma.choreAssignment.create({
          data: { choreId: chore.id, userId }
        });
      }
    }

    const fullChore = await prisma.chore.findUnique({
      where: { id: chore.id },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('new_chore', fullChore);
    }

    res.status(201).json(fullChore);
  } catch (error: any) {
    console.error('Error creating chore:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    
    const chores = await prisma.chore.findMany({
      where: { groupId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(chores);
  } catch (error) {
    console.error('Error fetching chores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateChoreAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignmentId = String(req.params.assignmentId);
    const { status } = req.body;
    
    const existing = await prisma.choreAssignment.findUnique({
      where: { id: assignmentId },
      include: { chore: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const assignment = await prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: { 
        status,
        completedAt: status === 'completed' ? new Date() : null
      },
      include: { chore: true, user: { select: { id: true, name: true } } }
    });

    // Handle rotation for recurring chores
    if (status === 'completed' && existing.status !== 'completed' && assignment.chore.frequency !== 'one-time') {
      const members = await prisma.groupMember.findMany({
        where: { groupId: assignment.chore.groupId },
        orderBy: { joinedAt: 'asc' }
      });
      
      if (members.length > 0) {
        const currentIndex = members.findIndex(m => m.userId === assignment.userId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % members.length : 0;
        const nextUserId = members[nextIndex].userId;
        
        let nextDueDate = new Date();
        const freq = assignment.chore.frequency;
        if (freq === 'daily') nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (freq === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (freq === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const newAssignment = await prisma.choreAssignment.create({
          data: {
            choreId: assignment.choreId,
            userId: nextUserId,
            status: 'pending'
          },
          include: { user: { select: { id: true, name: true } } }
        });
        
        await prisma.chore.update({
          where: { id: assignment.choreId },
          data: { dueDate: nextDueDate }
        });

        if ((req as any).io) {
          (req as any).io.to(assignment.chore.groupId).emit('chore_assignment_created', newAssignment);
          await createAndEmitNotification(
            (req as any).io,
            nextUserId,
            'Your Turn!',
            `It is now your turn to do the chore: ${assignment.chore.title}.`,
            'chore'
          );
        }
      }
    }

    // Activity Log
    if (status === 'completed' && existing.status !== 'completed') {
      await prisma.activityLog.create({
        data: {
          groupId: assignment.chore.groupId,
          userId: assignment.userId,
          action: 'completed',
          entity: 'chore',
          entityId: assignment.chore.id,
          details: assignment.chore.title
        }
      });
    }

    if ((req as any).io) {
      (req as any).io.to(assignment.chore.groupId).emit('chore_updated', assignment);
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteChore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const choreId = String(req.params.choreId);
    const groupId = String(req.params.groupId);
    
    await prisma.chore.delete({ where: { id: choreId } });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('chore_deleted', choreId);
    }

    res.status(200).json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Error deleting chore:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
