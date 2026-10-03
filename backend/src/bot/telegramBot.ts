import { PrismaClient } from '@prisma/client';
import { RoomioBotService } from './botService';
import TelegramBot from 'node-telegram-bot-api';

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN || '';

export const startTelegramBot = () => {
  if (!token) {
    console.log('[Telegram Bot] No token provided, skipping.');
    return;
  }

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

        bot.sendMessage(chatId, `✅ Linked! Hey *${existingUser.name}*, your Telegram is now connected to Roomio!\n\nTry: *"I paid 500 for groceries"*`, { parse_mode: 'Markdown' });
        return;
      }

      if (!user) {
        bot.sendMessage(chatId, "Please link your account first by typing:\n`/link <your_email>`", { parse_mode: 'Markdown' });
        return;
      }

      const userGroup = await prisma.groupMember.findFirst({ where: { userId: user.id } });
      const groupId = userGroup?.groupId;

      if (!groupId) {
        bot.sendMessage(chatId, "⚠️ You are not part of any group yet! Please join or create a group in the Roomio app first.");
        return;
      }

      bot.sendChatAction(chatId, 'typing');

      const intentResult = await RoomioBotService.extractIntent(text, user.id, groupId);

      if (intentResult.intent === 'CREATE_EXPENSE' && intentResult.amount) {
        const expense = await prisma.expense.create({
          data: {
            title: intentResult.title || 'Telegram Expense',
            amount: intentResult.amount,
            payerId: user.id,
            groupId: groupId,
            splitType: 'equal',
            date: new Date()
          }
        });

        const allMembers = await prisma.groupMember.findMany({ where: { groupId } });
        const splitAmount = intentResult.amount / allMembers.length;

        for (const m of allMembers) {
          await prisma.expenseParticipant.create({
            data: {
              expenseId: expense.id,
              userId: m.userId,
              share: splitAmount,
              calculatedAmount: splitAmount
            }
          });
        }

        bot.sendMessage(chatId, `✅ *Expense added!*\n\n${intentResult.reply}`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, intentResult.reply || "Done!");
      }

    } catch (error) {
      console.error('[Telegram Bot Error]', error);
      bot.sendMessage(chatId, "⚠️ Something went wrong. Please try again.");
    }
  });
};
