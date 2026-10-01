import { ArrowUpRight, ArrowDownRight, CreditCard, Utensils, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/api';
import { useAppContext } from '../context/AppContext';

const Dashboard = () => {
  const { user, activeGroup } = useAppContext();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', activeGroup?.id],
    queryFn: () => fetchDashboardData(activeGroup?.id || ''),
    enabled: !!activeGroup?.id
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-500">Error loading dashboard data.</div>;
  }

  // Calculate totals for UI based on the actual ledger
  let totalOwedToYou = 0;
  let totalYouOwe = 0;
  let oweCount = 0;
  let owedCount = 0;
  
  const currentUser = user?.id || 'Unknown';
  const currentUserName = user?.name || 'User';
  const myBalance = data.balances[currentUser] || 0;

  data.settlements.forEach((s: any) => {
    if (s.to === currentUser) {
      totalOwedToYou += s.amount;
      owedCount++;
    }
    if (s.from === currentUser) {
      totalYouOwe += s.amount;
      oweCount++;
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {currentUserName}. Here's your financial overview.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none" variant="outline">
            <Link to="/app/settlements">Settle Up</Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/app/expenses/new">Add Expense</Link>
          </Button>
        </div>
      </div>

      {/* Main Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <CreditCard className="w-24 h-24 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 font-medium text-sm uppercase tracking-wider">Total Net Balance</CardDescription>
            <CardTitle className="text-4xl">₹{Math.abs(myBalance).toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-100 mt-1 flex items-center gap-1">
              {myBalance >= 0 ? (
                <><ArrowUpRight className="w-4 h-4 text-emerald-300" /> You are owed overall</>
              ) : (
                <><ArrowDownRight className="w-4 h-4 text-red-300" /> You owe overall</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription>You Owe</CardDescription>
              <CardTitle className="text-2xl text-red-500">₹{totalYouOwe.toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 mt-2">To {oweCount} people</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardDescription>You Are Owed</CardDescription>
              <CardTitle className="text-2xl text-emerald-500">₹{totalOwedToYou.toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 mt-2">From {owedCount} people</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Expenses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/expenses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.expenses.slice(0, 5).map((expense: any, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600`}>
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{expense.title}</h4>
                      <p className="text-sm text-slate-500">{expense.payerId === currentUser ? 'You paid' : `${expense.payerId} paid`} • {expense.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">₹{expense.amount.toLocaleString()}</div>
                    <div className={`text-sm ${expense.payerId === currentUser ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {expense.participants.length} participants
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Settlements */}
        <Card>
          <CardHeader>
            <CardTitle>Who Owes You</CardTitle>
            <CardDescription>Top outstanding balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {data.settlements.filter((s: any) => s.to === currentUser).length === 0 && (
                <div className="text-sm text-slate-500 italic">No one owes you money right now!</div>
              )}
              {data.settlements.filter((s: any) => s.to === currentUser).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-600">
                      {s.from.charAt(0)}
                    </div>
                    <span className="font-medium">{s.from}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-500">₹{s.amount}</span>
                    <Button size="sm" variant="outline" className="text-xs h-8">Remind</Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-5">
              <h4 className="font-medium text-sm text-slate-500 mb-4 uppercase tracking-wider">You Owe</h4>
              {data.settlements.filter((s: any) => s.from === currentUser).length === 0 && (
                <div className="text-sm text-slate-500 italic">You don't owe anyone right now!</div>
              )}
              {data.settlements.filter((s: any) => s.from === currentUser).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-600">
                      {s.to.charAt(0)}
                    </div>
                    <span className="font-medium">{s.to}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-500">₹{s.amount}</span>
                    <Button size="sm" className="text-xs h-8">Pay</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
