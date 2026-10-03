import { CreditCard, Utensils, Loader2, Users, Plus, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import ChoresSummary from '../components/ui/ChoresSummary';
import ShoppingSummary from '../components/ui/ShoppingSummary';

const Dashboard = () => {
  const { user, activeGroup, groups } = useAppContext();
  useRealtimeUpdates(activeGroup?.id);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', activeGroup?.id],
    queryFn: () => fetchDashboardData(activeGroup?.id || ''),
    enabled: !!activeGroup?.id
  });

  const currentUserName = user?.name || 'User';

  // Onboarding state: No groups yet
  if (!activeGroup && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Welcome to FairFlat, {currentUserName}! 👋</h1>
        <p className="text-lg text-slate-500 max-w-lg mb-8 leading-relaxed">
          You don't have any groups yet. Create a new group to start tracking expenses and splitting bills with your friends or roommates.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all">
            <Link to="/app/groups" className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Create a Group
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Onboarding state: Group exists but only 1 member (themselves)
  if (activeGroup && (!activeGroup.members || activeGroup.members.length <= 1)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <Share2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">You're almost there! 🚀</h1>
        <p className="text-lg text-slate-500 max-w-lg mb-8 leading-relaxed">
          Your group <strong>"{activeGroup.name}"</strong> is ready, but it's just you right now! Invite your friends using the code below so you can start splitting expenses.
        </p>
        <Card className="bg-slate-50 border-dashed border-2 border-slate-200 mb-8 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Group Invite Code</div>
            <div className="text-4xl font-mono font-bold text-slate-900 tracking-[0.2em]">{activeGroup.inviteCode}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
  let totalHousehold = 0;
  let yourSpending = 0;
  
  const currentUserId = user?.id || 'Unknown';
  const myBalance = data.balances[currentUserId] || 0;

  data.expenses.forEach((expense: any) => {
    totalHousehold += expense.amount;
    const myShare = expense.participants?.find((p: any) => p.userId === currentUserId);
    if (myShare) {
      yourSpending += myShare.calculatedAmount;
    }
  });

  data.settlements.forEach((s: any) => {
    if (s.to === currentUserId) {
      totalOwedToYou += s.amount;
    }
    if (s.from === currentUserId) {
      totalYouOwe += s.amount;
    }
  });

  const getUserName = (userId: string) => {
    if (userId === currentUserId) return 'You';
    const member = activeGroup?.members?.find((m: any) => m.user.id === userId);
    return member ? member.user.name : userId.substring(0, 4);
  };

  const getTargetName = (userId: string) => {
    const name = getUserName(userId);
    return name === 'You' ? 'You' : name;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {currentUserName}. Here's your household overview.</p>
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

      {/* Money Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Household Expenses</CardDescription>
            <CardTitle className="text-2xl">₹{totalHousehold.toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Spending</CardDescription>
            <CardTitle className="text-2xl">₹{yourSpending.toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex justify-between">
              <span>You Owe</span>
              <span className="text-red-500 font-semibold">₹{totalYouOwe.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </CardDescription>
            <CardDescription className="flex justify-between">
              <span>You are Owed</span>
              <span className="text-emerald-500 font-semibold">₹{totalOwedToYou.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t mt-2 border-slate-200">
             <div className="flex justify-between items-center text-lg font-bold">
               <span>Net Balance</span>
               <span className={myBalance >= 0 ? "text-emerald-600" : "text-red-600"}>
                 {myBalance >= 0 ? '+' : ''}₹{myBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
               </span>
             </div>
          </CardContent>
        </Card>
        
        {/* Settlement Debt graph snippet */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Outstanding Debts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             {data.settlements.length === 0 ? (
               <div className="text-sm text-slate-500 italic">No outstanding debts.</div>
             ) : (
               data.settlements.map((s: any, i: number) => (
                 <div key={i} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 font-medium">
                     <span>{getTargetName(s.from)}</span>
                     <span className="text-slate-400">→</span>
                     <span>{getTargetName(s.to)}</span>
                   </div>
                   <div className="font-semibold text-slate-900">
                     ₹{s.amount.toLocaleString()}
                   </div>
                 </div>
               ))
             )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChoresSummary groupId={activeGroup?.id || ''} />
        <ShoppingSummary groupId={activeGroup?.id || ''} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bills */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Upcoming Bills</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/recurring">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(!data.recurring || data.recurring.length === 0) && (
                <div className="text-sm text-slate-500 italic mt-2">No recurring bills set.</div>
              )}
              {data.recurring?.filter((r: any) => r.isActive).sort((a: any, b: any) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime()).slice(0, 5).map((bill: any, i: number) => {
                const daysUntil = Math.ceil((new Date(bill.nextRun).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                return (
                  <div key={i} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-3 last:pb-0 pt-2">
                    <div>
                      <p className="font-semibold text-slate-900">{bill.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${daysUntil <= 3 ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        {daysUntil <= 0 ? 'Due today' : `Due in ${daysUntil} days`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">₹{bill.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 capitalize">{bill.interval}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/activity">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.activity?.length === 0 && (
                <div className="text-sm text-slate-500 italic">No recent activity.</div>
              )}
              {data.activity?.slice(0, 10).map((act: any, i: number) => {
                const actUser = act.user?.id === currentUserId ? 'You' : (act.user?.name || 'Someone');
                let icon = <Utensils className="w-5 h-5 text-slate-500" />;
                let bgColor = "bg-slate-100";
                let description = act.details || act.action;
                
                if (act.entity === 'expense') {
                  icon = <CreditCard className="w-5 h-5 text-blue-600" />;
                  bgColor = "bg-blue-100";
                  description = `${actUser} ${act.action} an expense`;
                } else if (act.entity === 'chore') {
                  bgColor = "bg-purple-100";
                  description = `${actUser} ${act.action} a chore`;
                } else if (act.entity === 'shopping') {
                  bgColor = "bg-orange-100";
                  description = `${actUser} ${act.action} a shopping item`;
                } else if (act.entity === 'settlement') {
                  bgColor = "bg-emerald-100";
                  description = `${actUser} ${act.action} a settlement`;
                }

                return (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{description}</p>
                      {act.details && <p className="text-xs text-slate-500 mt-0.5">{act.details}</p>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
