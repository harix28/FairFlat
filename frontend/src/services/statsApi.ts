import api from './api';

/**
 * Fetch aggregated statistics for a group.
 * Returns an object with:
 *   totalExpenses: number
 *   totalPaid: number
 *   totalChores: number
 *   completedChores: number
 *   totalShoppingSpend: number
 *   expenseTrend: Array<{ month: string; amount: number }>
 */
export const getGroupStats = (groupId: string) => api.get(`/groups/${groupId}/stats`);
