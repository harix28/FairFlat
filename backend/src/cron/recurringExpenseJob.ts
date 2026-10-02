import cron from 'node-cron';
import { prisma } from '../prisma';

export const initCronJobs = () => {
  // Run every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily recurring expense check...');
    try {
      const today = new Date();
      
      const dueExpenses = await prisma.recurringExpense.findMany({
        where: {
          isActive: true,
          nextRun: {
            lte: today
          }
        },
        include: {
          participants: true
        }
      });

      console.log(`[CRON] Found ${dueExpenses.length} recurring expenses due today.`);

      for (const recurring of dueExpenses) {
        await prisma.$transaction(async (tx) => {
          // 1. Create the actual Expense
          const newExpense = await tx.expense.create({
            data: {
              groupId: recurring.groupId,
              payerId: recurring.payerId,
              amount: recurring.amount,
              title: recurring.title,
              category: recurring.category,
              splitType: recurring.splitType,
              date: new Date()
            }
          });

          // 2. Create the participants for the expense
          for (const p of recurring.participants) {
            await tx.expenseParticipant.create({
              data: {
                expenseId: newExpense.id,
                userId: p.userId,
                share: p.share,
                calculatedAmount: p.calculatedAmount
              }
            });
          }

          // 3. Update the recurring expense's nextRun date
          const nextDate = new Date(recurring.nextRun);
          if (recurring.interval === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          if (recurring.interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          if (recurring.interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          if (recurring.interval === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

          await tx.recurringExpense.update({
            where: { id: recurring.id },
            data: { nextRun: nextDate }
          });
          
          console.log(`[CRON] Successfully processed recurring expense: ${recurring.title}`);
        });
      }
    } catch (error) {
      console.error('[CRON] Error processing recurring expenses:', error);
    }
  });
};
