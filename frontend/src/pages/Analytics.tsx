import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getGroupStats } from '../services/statsApi';
import { useAppContext } from '../context/AppContext';
import { Loader2, Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Button } from '../components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    memberContributions = [],
  } = data;

  // Prepare data for the expense trend line chart (month vs amount)
  const lineData = expenseTrend.map((item: any) => ({ month: item.month, amount: item.amount }));

  const generatePDF = () => {
    const doc = new jsPDF();
    const groupName = activeGroup?.name || 'Group';
    const dateStr = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(22);
    doc.text(`FairFlat End-of-Month Report`, 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`Group: ${groupName} | Date: ${dateStr}`, 14, 30);

    // Key Metrics Table
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Key Metrics', 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Expenses', `Rs. ${totalExpenses.toLocaleString()}`],
        ['Total Paid by You', `Rs. ${totalPaid.toLocaleString()}`],
        ['Total Chores', totalChores.toString()],
        ['Chores Completed', completedChores.toString()],
        ['Shopping Items', totalShoppingSpend.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    // Leaderboard
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(16);
    doc.text('Household Contribution Leaderboard', 14, finalY + 15);

    const leaderboardBody = memberContributions.map((m: any, idx: number) => [
      `#${idx + 1} ${m.name}`,
      m.choresDone.toString(),
      m.itemsBought.toString(),
      m.expensesPaid.toString(),
      m.score.toString(),
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Member', 'Chores Done', 'Purchases', 'Bills Paid', 'Score']],
      body: leaderboardBody,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
    });

    // Save PDF
    doc.save(`FairFlat_Report_${groupName}_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Discover your spending habits and group trends.</p>
        </div>
        <Button onClick={generatePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF Report
        </Button>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Overall group statistics</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</h3>
            <p className="text-2xl font-bold text-blue-700 mt-1">₹{totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid (You)</h3>
            <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Chores</h3>
            <p className="text-2xl font-bold text-purple-700 mt-1">{totalChores}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chores Done</h3>
            <p className="text-2xl font-bold text-amber-700 mt-1">{completedChores}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shopping Spend</h3>
            <p className="text-2xl font-bold text-orange-700 mt-1">{totalShoppingSpend} <span className="text-sm font-medium">items</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Household Contribution Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Household Contribution
            </CardTitle>
            <CardDescription>Who is helping out the most around the house?</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {data.memberContributions?.length === 0 && (
                <div className="p-6 text-center text-slate-500 italic">Not enough data to calculate contributions yet.</div>
              )}
              {data.memberContributions?.map((member: any, idx: number) => (
                <div key={member.userId} className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50 ${idx === 0 ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-slate-600 bg-slate-100 shadow-sm relative">
                      {idx === 0 && <span className="absolute -top-2 -right-1 text-lg">👑</span>}
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500 flex gap-3 mt-1">
                        <span><span className="font-medium text-slate-700">{member.choresDone}</span> chores</span>
                        <span><span className="font-medium text-slate-700">{member.itemsBought}</span> purchases</span>
                        <span><span className="font-medium text-slate-700">{member.expensesPaid}</span> bills paid</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                      {member.score}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Points</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Trend</CardTitle>
            <CardDescription>Monthly expense progression</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis tickFormatter={(val) => `₹${val / 1000}k`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    name="Amount" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
