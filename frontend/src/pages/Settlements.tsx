import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardData, expenseApi } from '../services/api';
import { useAppContext } from '../context/AppContext';

const Settlements = () => {
  const { user, activeGroup } = useAppContext();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSimplified, setIsSimplified] = useState(false);

  const getUserName = (userId: string) => {
    if (userId === user?.id) return 'You';
    const member = activeGroup?.members?.find((m: any) => m.user.id === userId);
    return member ? member.user.name : userId.substring(0, 4);
  };
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeGroup?.id],
    queryFn: () => fetchDashboardData(activeGroup?.id || ''),
    enabled: !!activeGroup?.id
  });

  const payMutation = useMutation({
    mutationFn: async (settlement: any) => {
      if (!activeGroup?.id) throw new Error('No active group');
      return expenseApi.recordPayment(activeGroup.id, {
        fromUserId: settlement.from,
        toUserId: settlement.to,
        amount: settlement.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroup?.id] });
      setProcessingId(null);
    },
    onError: () => {
      alert('Failed to record payment');
      setProcessingId(null);
    }
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { settlements, simplifiedSettlements } = data;
  const displaySettlements = isSimplified ? simplifiedSettlements : settlements;
  
  const hasSimplification = simplifiedSettlements && settlements && simplifiedSettlements.length < settlements.length;

  const handleMarkPaid = (s: any, index: number) => {
    setProcessingId(index.toString());
    payMutation.mutate(s);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settlements</h1>
        <p className="text-slate-500 mt-1">Settle up with your group and clear balances.</p>
      </div>

      {hasSimplification && !isSimplified && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900 text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Simplification Suggestion
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              You can settle all debts with just {simplifiedSettlements.length} transaction{simplifiedSettlements.length !== 1 ? 's' : ''} instead of {settlements.length}.
            </p>
          </div>
          <Button onClick={() => setIsSimplified(true)} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            Accept Simplification
          </Button>
        </div>
      )}

      {isSimplified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-emerald-900 text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Smart Debt Simplification Active
            </h3>
            <p className="text-sm text-emerald-700 mt-1">
              Debts have been mathematically minimized to {simplifiedSettlements.length} transaction{simplifiedSettlements.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsSimplified(false)} className="shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
            Revert to Exact Debts
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suggested Transactions</CardTitle>
          <CardDescription>Pay these amounts to clear all balances in the group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displaySettlements.length === 0 && (
              <div className="text-center py-10">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">You're all settled up!</h3>
                <p className="text-slate-500 mt-2">No one owes anything in this group.</p>
              </div>
            )}
            
            {displaySettlements.map((s: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all gap-4">
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      {getUserName(s.from).charAt(0)}
                    </div>
                    <span className="font-semibold">{getUserName(s.from)}</span>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {getUserName(s.to).charAt(0)}
                    </div>
                    <span className="font-semibold">{getUserName(s.to)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <span className="font-bold text-xl text-slate-900">₹{s.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  <Button 
                    className="w-full sm:w-auto shadow-sm" 
                    onClick={() => handleMarkPaid(s, i)}
                    disabled={processingId === i.toString()}
                  >
                    {processingId === i.toString() ? 'Processing...' : 'Mark Paid'}
                  </Button>
                </div>
                
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settlements;
