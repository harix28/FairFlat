import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Search, Filter, Plus, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardData, expenseApi } from '../services/api';
import { useAppContext } from '../context/AppContext';

const Expenses = () => {
  const [search, setSearch] = useState('');
  const { activeGroup, user } = useAppContext();
  
  const getUserName = (userId: string) => {
    if (userId === user?.id) return 'You';
    const member = activeGroup?.members?.find(m => m.user.id === userId);
    return member?.user.name || 'Someone';
  };

  const getMonth = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleString('default', { month: 'short' }); } 
    catch { return 'M'; }
  };
  
  const getDay = (dateStr: string) => {
    try { return new Date(dateStr).getDate().toString().padStart(2, '0'); } 
    catch { return '01'; }
  };
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeGroup?.id],
    queryFn: () => fetchDashboardData(activeGroup?.id || ''),
    enabled: !!activeGroup?.id
  });

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => expenseApi.deleteExpense(activeGroup?.id || '', expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroup?.id] });
    },
    onError: () => {
      alert('Failed to delete expense');
    }
  });

  const handleDelete = (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(expenseId);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredExpenses = data.expenses.filter((e: any) => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Track and manage all group expenses.</p>
        </div>
        <Button asChild>
          <Link to="/app/expenses/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="px-3">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {filteredExpenses.map((expense: any, i: number) => (
          <Card key={i} className="hover:border-blue-200 transition-colors cursor-pointer group">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-slate-100 text-slate-600 flex-shrink-0">
                  <span className="text-xs font-semibold uppercase">{getMonth(expense.date)}</span>
                  <span className="text-lg font-bold leading-none">
                    {getDay(expense.date)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-lg">{expense.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-slate-500">{getUserName(expense.payerId)} paid ₹{expense.amount.toLocaleString()}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-sm text-slate-500 capitalize">{expense.splitType} Split</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:block">
                  <div className="font-semibold text-slate-900">₹{expense.amount.toLocaleString()}</div>
                  <div className="text-sm text-emerald-500">{expense.participants.length} involved</div>
                </div>
                {expense.payerId === user?.id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-2"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(expense.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No expenses found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
