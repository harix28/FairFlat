import api from './api';

interface StatsResponse {
  totalExpenses: number;
  totalPaid: number;
  totalChores: number;
  completedChores: number;
  totalShoppingSpend: number;
  expenseTrend: Array<{ month: string; amount: number }>;
}

/**
 * Fetch aggregated statistics for a group.
 */
export const getGroupStats = async (groupId: string): Promise<StatsResponse> => {
  const res = await api.get(`/groups/${groupId}/stats`);
  return res.data;
};
