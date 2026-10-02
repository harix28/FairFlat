import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getGroupStats } from '../services/statsApi';
import { useAppContext } from '../context/AppContext';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const Analytics = () => {
  const { activeGroup } = useAppContext();

  const { data, isLoading } = useQuery({
    queryKey: ['stats', activeGroup?.id],
    queryFn: () => getGroupStats(activeGroup?.id || ''),
    enabled: !!activeGroup?.id,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const {
    totalExpenses = 0,
    totalPaid = 0,
    totalChores = 0,
    completedChores = 0,
    totalShoppingSpend = 0,
    expenseTrend = [],
  } = data;

  // Prepare data for the expense trend line chart (month vs amount)
  const lineData = expenseTrend.map((item: any) => ({ month: item.month, amount: item.amount }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Discover your spending habits and group trends.</p>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Overall group statistics</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-4">
          <div className="bg-blue-50 rounded p-3">
            <h3 className="text-sm font-medium text-slate-600">Total Expenses</h3>
            <p className="text-xl font-bold text-slate-900">₹{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <h3 className="text-sm font-medium text-slate-600">Total Paid (You)</h3>
            <p className="text-xl font-bold text-slate-900">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 rounded p-3">
            <h3 className="text-sm font-medium text-slate-600">Total Chores</h3>
            <p className="text-xl font-bold text-slate-900">{totalChores}</p>
          </div>
          <div className="bg-yellow-50 rounded p-3">
            <h3 className="text-sm font-medium text-slate-600">Completed Chores</h3>
            <p className="text-xl font-bold text-slate-900">{completedChores}</p>
          </div>
          <div className="bg-indigo-50 rounded p-3">
            <h3 className="text-sm font-medium text-slate-600">Shopping Spend</h3>
            <p className="text-xl font-bold text-slate-900">{totalShoppingSpend} items</p>
          </div>
        </CardContent>
      </Card>

      {/* Expense Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Trend</CardTitle>
          <CardDescription>Monthly expense progression</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="amount" name="Amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
