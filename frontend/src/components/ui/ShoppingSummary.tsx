import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { shoppingApi } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { ShoppingBag } from 'lucide-react';

/**
 * ShoppingSummary – provides a quick overview of shopping items for the group.
 * Shows total items, pending purchases, and completed purchases.
 */
const ShoppingSummary: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shopping', groupId],
    queryFn: () => shoppingApi.getItems(groupId).then(res => res.data),
    enabled: !!groupId,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading shopping list...</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load shopping items.</p>;

  const total = data?.length ?? 0;
  const pending = data?.filter((i: any) => i.status !== 'purchased').length ?? 0;
  const purchased = total - pending;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardDescription className="text-sm font-medium uppercase text-slate-500">
            Shopping Summary
          </CardDescription>
          <CardTitle className="text-2xl font-bold">{total} items</CardTitle>
        </div>
        <ShoppingBag className="w-8 h-8 text-indigo-600" />
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex space-x-4 text-sm text-slate-600">
          <span>Pending: {pending}</span>
          <span>Purchased: {purchased}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShoppingSummary;
