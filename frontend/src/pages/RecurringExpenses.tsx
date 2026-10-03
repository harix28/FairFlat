import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, Plus, Repeat, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../services/api';
import { useAppContext } from '../context/AppContext';

const RecurringExpenses = () => {
  const { activeGroup } = useAppContext();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    interval: 'monthly',
    nextRun: new Date().toISOString().split('T')[0]
  });

  const { data: recurring, isLoading } = useQuery({
    queryKey: ['recurring', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) return [];
      const res = await expenseApi.getRecurring(activeGroup.id);
      return res.data;
    },
    enabled: !!activeGroup?.id
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!activeGroup?.id) throw new Error('No active group');
      return expenseApi.createRecurring(activeGroup.id, {
        ...data,
        amount: parseFloat(data.amount),
        splitType: 'equal' // Defaulting to equal for simplicity in UI right now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', activeGroup?.id] });
      setIsAdding(false);
      setFormData({ title: '', amount: '', interval: 'monthly', nextRun: new Date().toISOString().split('T')[0] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      if (!activeGroup?.id) throw new Error('No active group');
      return expenseApi.updateRecurring(activeGroup.id, id, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', activeGroup?.id] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (!activeGroup) {
    return <div className="text-center p-10 text-slate-500">Please select or create a group first.</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recurring Expenses</h1>
          <p className="text-slate-500 mt-1">Automate your monthly rent, subscriptions, and utilities.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? 'Cancel' : 'Add Recurring'}
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-8 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle>Add New Recurring Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-md" placeholder="e.g. Netflix" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                  <input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border rounded-md" placeholder="e.g. 649" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interval</label>
                  <select value={formData.interval} onChange={e => setFormData({...formData, interval: e.target.value})} className="w-full p-2 border rounded-md">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Next Billing Date</label>
                  <input type="date" required value={formData.nextRun} onChange={e => setFormData({...formData, nextRun: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Recurring Expense'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : recurring?.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No recurring expenses yet</h3>
          <p className="text-slate-500 mt-1">Automate your bills so you never forget to split them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recurring?.map((item: any) => (
            <Card key={item.id} className="hover:border-blue-200 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-blue-500" />
                    {item.title}
                  </CardTitle>
                  <CardDescription>Split {item.splitType}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${item.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${item.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                  </span>
                  <span className="text-sm text-slate-500">{item.isActive ? 'Active' : 'Paused'}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium capitalize">Every {item.interval}</span>
                  <span className="ml-auto text-slate-400">Next: {new Date(item.nextRun).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <Button 
                    variant={item.isActive ? "outline" : "default"} 
                    size="sm"
                    className={item.isActive ? "text-slate-600 hover:text-orange-600 hover:bg-orange-50" : "bg-emerald-600 hover:bg-emerald-700"}
                    onClick={() => updateMutation.mutate({ id: item.id, isActive: !item.isActive })}
                    disabled={updateMutation.isPending}
                  >
                    {item.isActive ? 'Pause Automation' : 'Resume Automation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringExpenses;
