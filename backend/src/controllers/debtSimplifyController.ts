import { Request, Response } from 'express';
import { computeDebtSimplification } from '../algorithms/debtSimplify';
import { AuthRequest } from '../middleware/auth';

export const getDebtSimplification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const suggestions = await computeDebtSimplification(groupId);
    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Error computing debt simplification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
