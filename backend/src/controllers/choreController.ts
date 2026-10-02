import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

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
    
    const assignment = await prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: { 
        status,
        completedAt: status === 'completed' ? new Date() : null
      },
      include: { chore: true }
    });

    if ((req as any).io) {
      // assignment.chore is included so groupId is available
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
