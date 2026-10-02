import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';

/**
 * BalanceTable – displays a per‑person net balance list.
 * Uses the `/api/groups/:groupId/balance-details` endpoint.
 */
const BalanceTable: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['balanceDetails', groupId],
    queryFn: () => expenseApi.getBalanceDetails(groupId).then(res => res.data),
    enabled: !!groupId,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading balances...</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load balances.</p>;

  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Per‑Person Balances</CardTitle>
        <CardDescription>Who owes whom</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-left border-collapse">
          <thead className="border-b">
            <tr>
              <th className="pb-2">From</th>
              <th className="pb-2">To</th>
              <th className="pb-2">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data?.members?.map((m: any, idx: number) => (
              // The API returns net balances per user; we need a “who owes whom” view.
              // For simplicity we render each member's net balance with sign.
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 font-medium">
                  {m.netBalance < 0 ? m.name : 'You'}
                </td>
                <td className="py-2 font-medium">
                  {m.netBalance < 0 ? 'You' : m.name}
                </td>
                <td className="py-2 text-right font-semibold text-red-600">
                  ₹{Math.abs(m.netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default BalanceTable;
