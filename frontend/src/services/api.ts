import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authApi = {
  login: async (data: any) => api.post('/auth/login', data),
  register: async (data: any) => api.post('/auth/register', data),
  googleLogin: async (data: any) => api.post('/auth/google', data),
  forgotPassword: async (data: any) => api.post('/auth/forgot-password', data),
  resetPassword: async (data: any) => api.post('/auth/reset-password', data),
  updateProfile: async (data: any) => api.put('/auth/profile', data),
};


export const groupApi = {
  getGroups: async () => api.get('/groups'),
  createGroup: async (data: any) => api.post('/groups', data),
  joinGroup: async (data: any) => api.post('/groups/join', data),
  updateGroup: async (groupId: string, data: any) => api.put(`/groups/${groupId}`, data),
  leaveGroup: async (groupId: string) => api.delete(`/groups/${groupId}/leave`),
};

export const expenseApi = {
  getExpenses: async (groupId: string) => api.get(`/groups/${groupId}/expenses`),
  createExpense: async (groupId: string, data: any) => api.post(`/groups/${groupId}/expenses`, data),
  deleteExpense: async (groupId: string, expenseId: string) => api.delete(`/groups/${groupId}/expenses/${expenseId}`),
  getBalances: async (groupId: string) => api.get(`/groups/${groupId}/balances`),
  getBalanceDetails: async (groupId: string) => api.get(`/groups/${groupId}/balance-details`),
  recordPayment: async (groupId: string, data: any) => api.post(`/groups/${groupId}/payments`, data),
  getRecurring: async (groupId: string) => api.get(`/groups/${groupId}/recurring`),
  createRecurring: async (groupId: string, data: any) => api.post(`/groups/${groupId}/recurring`, data),
  updateRecurring: async (groupId: string, expenseId: string, data: any) => api.put(`/groups/${groupId}/recurring/${expenseId}`, data),
};


export const notificationApi = {
  getNotifications: async () => api.get('/notifications'),
  sendReminder: async (data: { targetUserId: string, amount: number }) => api.post('/notifications/remind', data),
  markAsRead: async (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: async () => api.put('/notifications/read-all'),
};

export const choreApi = {
  getChores: async (groupId: string) => api.get(`/groups/${groupId}/chores`)
};

export const shoppingApi = {
  getItems: async (groupId: string) => api.get(`/groups/${groupId}/shopping`)
};

export const botApi = {
  chat: async (data: any) => api.post('/bot/chat', data),
  scanReceipt: async (base64Image: string, mimeType: string, groupId?: string) => api.post('/bot/scan', { base64Image, mimeType, groupId })
};

export const scanReceipt = async (imageFile: File, groupId?: string) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      try {
        const base64Str = (reader.result as string).split(',')[1];
        const res = await botApi.scanReceipt(base64Str, imageFile.type, groupId);
        resolve(res.data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const fetchDashboardData = async (groupId: string) => {
  if (!groupId) return { expenses: [], balances: {}, settlements: [], activity: [], recurring: [] };
  try {
    const [expensesRes, balancesRes, activityRes, recurringRes] = await Promise.all([
      expenseApi.getExpenses(groupId),
      expenseApi.getBalances(groupId),
      api.get(`/groups/${groupId}/activity`),
      expenseApi.getRecurring(groupId)
    ]);

    return {
      expenses: expensesRes.data,
      balances: balancesRes.data.balances,
      settlements: balancesRes.data.settlements,
      simplifiedSettlements: balancesRes.data.simplifiedSettlements || balancesRes.data.settlements,
      activity: activityRes.data,
      recurring: recurringRes.data
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export const createExpense = async (groupId: string, data: any) => {
  if (!groupId) throw new Error('No active group');
  const res = await expenseApi.createExpense(groupId, data);
  return res.data.expense;
};

