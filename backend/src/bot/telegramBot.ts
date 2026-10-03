import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { RoomioBotService } from './bot/botService';

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN || '8760657501:AAFJLyxboJ21uX4FPkWtyKLfEXhRvs-V8IU';

export const startTelegramBot = () => {
  if (!token) return;

  const bot = new TelegramBot(token, { polling: true });
  console.log('[Telegram Bot] Started polling...');

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text === '/start') {
      bot.sendMessage(chatId, "Welcome to *RoomioBot*! 🚀\n\nTo link your Roomio account, type:\n`/link <your_email>`", { parse_mode: 'Markdown' });
      return;
    }

    try {
      const user = await prisma.user.findFirst({ where: { telegramChatId: chatId.toString() } });

      if (text.startsWith('/link')) {
        const email = text.split(' ')[1];
        if (!email) {
          bot.sendMessage(chatId, "Please provide your email. Example: `/link hari@example.com`", { parse_mode: 'Markdown' });
          return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (!existingUser) {
          bot.sendMessage(chatId, `No Roomio account found with email: ${email}`);
          return;
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data: { telegramChatId: chatId.toString() }
        });

        bot.sendMessage(chatId, `Success! 🎉 Your Telegram is now linked to **${existingUser.name}**.\n\nTry sending a message like: *"I paid 500 for groceries"*`, { parse_mode: 'Markdown' });
        return;
      }

      if (!user) {
        bot.sendMessage(chatId, "Please link your account first by typing: `/link <your_email>`", { parse_mode: 'Markdown' });
        return;
      }

      const userGroup = await prisma.groupMember.findFirst({ where: { userId: user.id } });
      const groupId = userGroup?.groupId;

      if (!groupId) {
        bot.sendMessage(chatId, "You are not part of any group yet! Please join or create a group in the app first.");
        return;
      }

      // Show typing indicator
      bot.sendChatAction(chatId, 'typing');

      // Call our Gemini AI bot logic
      const intentResult = await RoomioBotService.extractIntent(text, user.id, groupId);

      // We only read intentResult.reply. In the app, CREATE_EXPENSE triggers a UI popup. 
      // In WhatsApp/Telegram, if they want to create an expense, we can actually create it!
      if (intentResult.intent === 'CREATE_EXPENSE') {
         // Create the expense automatically since we don't have a UI modal here
         const expense = await prisma.expense.create({
            data: {
              title: intentResult.title || 'Telegram Expense',
              amount: intentResult.amount || 0,
              payerId: user.id,
              groupId: groupId,
              splitType: 'equal',
              date: new Date()
            }
         });
         
         const allMembers = await prisma.groupMember.findMany({ where: { groupId } });
         const splitAmount = (intentResult.amount || 0) / allMembers.length;
         
         for (const m of allMembers) {
           await prisma.expenseParticipant.create({
             data: {
               expenseId: expense.id,
               userId: m.userId,
               shareAmount: splitAmount,
               calculatedAmount: splitAmount
             }
           });
         }
         
         bot.sendMessage(chatId, `✅ Expense added!\n\n${intentResult.reply}`);
      } else {
         bot.sendMessage(chatId, intentResult.reply || "Done!");
      }

    } catch (error) {
      console.error('[Telegram Bot Error]', error);
      bot.sendMessage(chatId, "Sorry, something went wrong processing your request.");
    }
  });
};
