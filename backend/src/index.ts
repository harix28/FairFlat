import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { register, login, updateProfile } from './controllers/authController';
import { createExpense, getGroupExpenses, deleteExpense } from './controllers/expenseController';
import { getGroupBalancesAndSettlements } from './controllers/settlementController';
import { getBalanceDetails } from './controllers/balanceDetailsController';
import { recordPayment } from './controllers/paymentController';
import { createGroup, getUserGroups, joinGroup, updateGroup, leaveGroup } from './controllers/groupController';
import { getUserNotifications, markNotificationAsRead, markAllAsRead, sendReminder } from './controllers/notificationController';
import { createRecurringExpense, getGroupRecurringExpenses } from './controllers/recurringExpenseController';
import { createChore, getChores, updateChoreAssignment, deleteChore } from './controllers/choreController';
import { createShoppingItem, getShoppingItems, updateShoppingItem, deleteShoppingItem } from './controllers/shoppingController';
import { getGroupStats } from './controllers/statsController';
import { getDebtSimplification } from './controllers/debtSimplifyController';
import { getMessages, createMessage, deleteMessage } from './controllers/chatController';
import { getActivityLogs } from './controllers/activityController';
import { FairBotService } from './bot/botService';
import { authenticateToken } from './middleware/auth';
import { initCronJobs } from './cron/recurringExpenseJob';

dotenv.config();

// Start cron jobs
initCronJobs();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Pass io to request so controllers can use it
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

const PORT = process.env.PORT || 5000;

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FairFlat API is running' });
});

// Auth Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.put('/api/auth/profile', authenticateToken, updateProfile);

// Group Routes (Protected)
app.post('/api/groups', authenticateToken, createGroup);
app.get('/api/groups', authenticateToken, getUserGroups);
app.post('/api/groups/join', authenticateToken, joinGroup);
app.put('/api/groups/:groupId', authenticateToken, updateGroup);
app.delete('/api/groups/:groupId/leave', authenticateToken, leaveGroup);

// Expense Routes (Protected)
app.post('/api/groups/:groupId/expenses', authenticateToken, createExpense);
app.get('/api/groups/:groupId/expenses', authenticateToken, getGroupExpenses);
app.delete('/api/groups/:groupId/expenses/:expenseId', authenticateToken, deleteExpense);
app.post('/api/groups/:groupId/recurring', authenticateToken, createRecurringExpense);
app.get('/api/groups/:groupId/recurring', authenticateToken, getGroupRecurringExpenses);

// Settlement Routes (Protected)
app.get('/api/groups/:groupId/balances', authenticateToken, getGroupBalancesAndSettlements);
app.get('/api/groups/:groupId/balance-details', authenticateToken, getBalanceDetails);
app.post('/api/groups/:groupId/payments', authenticateToken, recordPayment);

// Chores Routes (Protected)
app.post('/api/groups/:groupId/chores', authenticateToken, createChore);
app.get('/api/groups/:groupId/chores', authenticateToken, getChores);
app.put('/api/groups/:groupId/chores/assignments/:assignmentId', authenticateToken, updateChoreAssignment);
app.delete('/api/groups/:groupId/chores/:choreId', authenticateToken, deleteChore);

// Shopping Routes (Protected)
app.post('/api/groups/:groupId/shopping', authenticateToken, createShoppingItem);
app.get('/api/groups/:groupId/shopping', authenticateToken, getShoppingItems);
app.put('/api/groups/:groupId/shopping/:itemId', authenticateToken, updateShoppingItem);
app.delete('/api/groups/:groupId/shopping/:itemId', authenticateToken, deleteShoppingItem);

// Chat Routes (Protected)
app.get('/api/groups/:groupId/messages', authenticateToken, getMessages);
app.post('/api/groups/:groupId/messages', authenticateToken, createMessage);
app.delete('/api/groups/:groupId/messages/:messageId', authenticateToken, deleteMessage);

// Activity Route (Protected)
app.get('/api/groups/:groupId/activity', authenticateToken, getActivityLogs);

// Stats Route (Protected)
app.get('/api/groups/:groupId/stats', authenticateToken, getGroupStats);

// Notification Routes (Protected)
app.get('/api/notifications', authenticateToken, getUserNotifications);
app.post('/api/notifications/remind', authenticateToken, sendReminder);
app.put('/api/notifications/:notificationId/read', authenticateToken, markNotificationAsRead);
app.put('/api/notifications/read-all', authenticateToken, markAllAsRead);

// Bot Route (Protected)
app.post('/api/bot/chat', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });
  
  const intent = await FairBotService.extractIntent(text);
  res.json({ result: intent });
});

app.post('/api/bot/scan', authenticateToken, async (req, res) => {
  const { base64Image, mimeType } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'Image is required' });
  
  try {
    const data = await FairBotService.scanReceipt(base64Image, mimeType || 'image/jpeg');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan receipt' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

