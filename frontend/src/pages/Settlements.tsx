import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/api';
import { useAppContext } from '../context/AppContext';

const Settlements = () => {
  const { activeGroup } = useAppContext();
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeGroup?.id],
    queryFn: () => fetchDashboardData(activeGroup?.id || ''),
    enabled: !!activeGroup?.id
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // The settlement engine automatically minimizes debts
  // We use data.settlements directly
  const settlements = data.settlements;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settlements</h1>
        <p className="text-slate-500 mt-1">Settle up with your group in the fewest possible transactions.</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-blue-900 text-lg">Algorithm Active</h3>
          <p className="text-sm text-blue-700 mt-1 max-w-md">Our Settlement Engine has reduced all group debts down to just {settlements.length} essential transaction{settlements.length !== 1 ? 's' : ''}.</p>
        </div>
        <div className="hidden sm:block">
          <CheckCircle2 className="w-12 h-12 text-blue-300" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suggested Transactions</CardTitle>
          <CardDescription>Pay these amounts to clear all balances in the group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settlements.length === 0 && (
              <div className="text-center py-10">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">You're all settled up!</h3>
                <p className="text-slate-500 mt-2">No one owes anything in this group.</p>
              </div>
            )}
            
            {settlements.map((s: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all gap-4">
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      {s.from.charAt(0)}
                    </div>
                    <span className="font-semibold">{s.from}</span>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {s.to.charAt(0)}
                    </div>
                    <span className="font-semibold">{s.to}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <span className="font-bold text-xl text-slate-900">₹{s.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  <Button className="w-full sm:w-auto shadow-sm">Mark Paid</Button>
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
