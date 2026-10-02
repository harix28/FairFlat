import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Loader2, CreditCard, ArrowDownRight, ShoppingCart, ListTodo, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Activity = () => {
  const { activeGroup } = useAppContext();

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activity', activeGroup?.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${activeGroup?.id}/activity`);
      return res.data;
    },
    enabled: !!activeGroup?.id,
    refetchInterval: 5000, // refresh every 5 seconds
  });

  // Auto scroll to bottom on new activity
  useEffect(() => {
    const el = document.getElementById('activity-bottom');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  if (!activeGroup) return <div className="p-8 text-center text-slate-500">Select a group first.</div>;

  if (isLoading) return (
    <div className="flex justify-center items-center h-[80vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  );

  if (error) return <div className="text-red-500">Failed to load activity.</div>;

  const iconFor = (type: string) => {
    switch (type) {
      case 'expense': return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'payment': return <ArrowDownRight className="w-5 h-5 text-emerald-600" />;
      case 'chore': return <ListTodo className="w-5 h-5 text-indigo-600" />;
      case 'shopping': return <ShoppingCart className="w-5 h-5 text-orange-600" />;
      default: return <Users className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Recent Activity</h1>
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
          {activities.length === 0 ? (
            <div className="text-center text-slate-400">No recent activity.</div>
          ) : (
            activities.map((act: any) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">{iconFor(act.type)}</div>
                <div className="flex-1">
                  <CardDescription className="font-medium">{act.title}</CardDescription>
                  <p className="text-sm text-slate-500">{act.subtitle}</p>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">{new Date(act.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
              </div>
            ))
          )}
          <div id="activity-bottom" />
        </CardContent>
      </Card>
    </div>
  );
};

export default Activity;
