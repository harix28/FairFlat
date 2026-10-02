import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ShoppingCart, Check, Circle, Trash2, Loader2, Plus, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Shopping = () => {
  const { activeGroup } = useAppContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [newItem, setNewItem] = useState('');
  
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopping', activeGroup?.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${activeGroup?.id}/shopping`);
      return res.data;
    },
    enabled: !!activeGroup?.id
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => await api.post(`/groups/${activeGroup?.id}/shopping`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', activeGroup?.id] });
      setNewItem('');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string, status: string }) => 
      await api.put(`/groups/${activeGroup?.id}/shopping/${itemId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping', activeGroup?.id] })
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => await api.delete(`/groups/${activeGroup?.id}/shopping/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping', activeGroup?.id] })
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    createMutation.mutate(newItem);
  };

  if (!activeGroup) return <div className="p-8 text-center text-slate-500">Select a group first.</div>;

  const pendingItems = items.filter((i: any) => i.status === 'pending');
  const purchasedItems = items.filter((i: any) => i.status === 'purchased');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shopping List</h1>
          <p className="text-slate-500 mt-1">Keep track of things you need to buy for the house.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 h-12 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
              placeholder="E.g., Milk, Toilet Paper, Dish Soap..." 
              value={newItem} 
              onChange={e => setNewItem(e.target.value)} 
            />
            <Button type="submit" className="h-12 px-6" disabled={createMutation.isPending || !newItem.trim()}>
              {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Your list is empty</h3>
          <p className="text-slate-500 mt-1">Add items above to start building your shopping list.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider pl-1">To Buy ({pendingItems.length})</h3>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {pendingItems.map((item: any, i: number) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 ${i !== pendingItems.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors group`}>
                    <div className="flex items-center gap-3 flex-1">
                      <button onClick={() => updateMutation.mutate({ itemId: item.id, status: 'purchased' })}>
                        <Circle className="w-6 h-6 text-slate-300 hover:text-blue-500 transition-colors" />
                      </button>
                      <span className="font-medium text-slate-800 text-lg">{item.name}</span>
                    </div>
                    <button onClick={() => deleteMutation.mutate(item.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchased Items */}
          {purchasedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recently Purchased</h3>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8" onClick={() => navigate('/app/expenses/new')}>
                  Convert to Expense <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                {purchasedItems.slice(0, 10).map((item: any, i: number) => (
                  <div key={item.id} className={`flex items-center justify-between p-3 px-4 ${i !== Math.min(purchasedItems.length, 10) - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateMutation.mutate({ itemId: item.id, status: 'pending' })}>
                        <Check className="w-5 h-5 text-emerald-500" />
                      </button>
                      <span className="text-slate-500 line-through">{item.name}</span>
                    </div>
                    <button onClick={() => deleteMutation.mutate(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Shopping;
