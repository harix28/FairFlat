import cron from 'node-cron';
import { prisma } from '../prisma';

export const initCronJobs = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily recurring expense check...');
    try {
      const today = new Date();
      
      // Fetch without participants (field does not exist on RecurringExpense)
      const dueExpenses = await prisma.recurringExpense.findMany({
        where: {
          isActive: true,
          nextRun: { lte: today }
        }
      });

      console.log(`[CRON] Found ${dueExpenses.length} recurring expenses due today.`);

      for (const recurring of dueExpenses) {
        await prisma.$transaction(async (tx) => {
          // 1. Create the actual Expense (no participants – equal split assumed)
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

          // 2. Fetch group members and create equal-split participants
          const members = await tx.groupMember.findMany({
            where: { groupId: recurring.groupId }
          });
          const share = recurring.amount / (members.length || 1);

          for (const member of members) {
            await tx.expenseParticipant.create({
              data: {
                expenseId: newExpense.id,
                userId: member.userId,
                share: null,
                calculatedAmount: share
              }
            });
          }

          // 3. Update nextRun date
          const nextDate = new Date(recurring.nextRun);
          if (recurring.interval === 'daily')   nextDate.setDate(nextDate.getDate() + 1);
          if (recurring.interval === 'weekly')  nextDate.setDate(nextDate.getDate() + 7);
          if (recurring.interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          if (recurring.interval === 'yearly')  nextDate.setFullYear(nextDate.getFullYear() + 1);

          await tx.recurringExpense.update({
            where: { id: recurring.id },
            data: { nextRun: nextDate }
          });

          console.log(`[CRON] Processed recurring expense: ${recurring.title}`);
        });
      }
    } catch (error) {
      console.error('[CRON] Error processing recurring expenses:', error);
    }
  });
};
