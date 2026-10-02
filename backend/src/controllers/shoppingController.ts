import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const createShoppingItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    const { name, quantity, category, priority } = req.body;
    
    const item = await prisma.shoppingItem.create({
      data: {
        groupId,
        name,
        quantity: quantity || 1,
        category,
        priority: priority || 'medium'
      }
    });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('new_shopping_item', item);
    }

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating shopping item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getShoppingItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId);
    
    const items = await prisma.shoppingItem.findMany({
      where: { groupId },
      include: { purchaser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching shopping items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateShoppingItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = String(req.params.itemId);
    const { status, purchasedBy } = req.body;
    
    const item = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: { status, purchasedBy },
      include: { purchaser: { select: { id: true, name: true } } }
    });

    if ((req as any).io) {
      (req as any).io.to(item.groupId).emit('shopping_item_updated', item);
    }

    res.json(item);
  } catch (error) {
    console.error('Error updating shopping item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteShoppingItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = String(req.params.itemId);
    const groupId = String(req.params.groupId);
    
    await prisma.shoppingItem.delete({ where: { id: itemId } });

    if ((req as any).io) {
      (req as any).io.to(groupId).emit('shopping_item_deleted', itemId);
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
