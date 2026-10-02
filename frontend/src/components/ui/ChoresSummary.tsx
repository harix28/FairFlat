import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { choreApi } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { ClipboardList } from 'lucide-react';

/**
 * ChoresSummary – shows a quick overview of chores for the active group.
 * Displays total chores, pending assignments, and completed assignments.
 */
const ChoresSummary: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['chores', groupId],
    queryFn: () => choreApi.getChores(groupId).then(res => res.data),
    enabled: !!groupId,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading chores...</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load chores.</p>;

  const total = data?.length || 0;
  const pending = data?.filter((c: any) =>
    c.assignments?.some((a: any) => a.status === 'pending' || a.status === 'skipped')
  ).length || 0;
  const completed = total - pending;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardDescription className="text-sm font-medium uppercase text-slate-500">
            Chores Summary
          </CardDescription>
          <CardTitle className="text-2xl font-bold">{total} chores</CardTitle>
        </div>
        <ClipboardList className="w-8 h-8 text-indigo-600" />
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex space-x-4 text-sm text-slate-600">
          <span>Pending: {pending}</span>
          <span>Completed: {completed}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChoresSummary;
