import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

const Analytics = () => {
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

  // Calculate dynamic pie chart data based on expenses
  const categoryTotals: Record<string, number> = {};
  data.expenses.forEach((e: any) => {
    const cat = e.title.includes('Restaurant') || e.title.includes('Food') ? 'Food & Dining' 
      : e.title.includes('Grocery') ? 'Groceries'
      : e.title.includes('Rent') ? 'Housing'
      : 'General';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  const pieData = Object.keys(categoryTotals).map((name, idx) => ({
    name,
    value: categoryTotals[name],
    color: COLORS[idx % COLORS.length]
  }));

  // Calculate dynamic bar chart data (Paid vs Fair Share)
  const userStats: Record<string, { name: string; contribution: number; fairShare: number }> = {};
  
  data.expenses.forEach((e: any) => {
    // Tally contributions
    if (!userStats[e.payerId]) userStats[e.payerId] = { name: e.payerId, contribution: 0, fairShare: 0 };
    userStats[e.payerId].contribution += e.amount;

    // Tally fair shares
    e.participants.forEach((p: any) => {
      if (!userStats[p.userId]) userStats[p.userId] = { name: p.userId, contribution: 0, fairShare: 0 };
      userStats[p.userId].fairShare += p.calculatedAmount;
    });
  });

  const barData = Object.values(userStats);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Discover your spending habits and group trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where the group's money went this month</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-64 w-full">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 w-full">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-medium text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contribution vs Fair Share</CardTitle>
            <CardDescription>Who paid vs who actually consumed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="contribution" name="Paid" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fairShare" name="Fair Share" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
