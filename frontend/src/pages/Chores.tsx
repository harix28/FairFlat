import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Circle, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const Chores = () => {
  const { activeGroup, user } = useAppContext();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newChore, setNewChore] = useState({ title: '', description: '', frequency: 'weekly', priority: 'medium', assigneeIds: [] as string[] });

  const { data: chores = [], isLoading } = useQuery({
    queryKey: ['chores', activeGroup?.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${activeGroup?.id}/chores`);
      return res.data;
    },
    enabled: !!activeGroup?.id
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => await api.post(`/groups/${activeGroup?.id}/chores`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', activeGroup?.id] });
      setShowAdd(false);
      setNewChore({ title: '', description: '', frequency: 'weekly', priority: 'medium', assigneeIds: [] });
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string, status: string }) => 
      await api.put(`/groups/${activeGroup?.id}/chores/assignments/${assignmentId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chores', activeGroup?.id] })
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (choreId: string) => await api.delete(`/groups/${activeGroup?.id}/chores/${choreId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chores', activeGroup?.id] })
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newChore);
  };

  const toggleAssignee = (userId: string) => {
    setNewChore(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter(id => id !== userId)
        : [...prev.assigneeIds, userId]
    }));
  };

  if (!activeGroup) return <div className="p-8 text-center text-slate-500">Select a group first.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chores</h1>
          <p className="text-slate-500 mt-1">Keep the house clean and share the workload.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Chore
        </Button>
      </div>

      {showAdd && (
        <Card className="border-blue-100 bg-blue-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New Chore</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <input type="text" required className="w-full h-10 px-3 rounded-md border" placeholder="E.g., Take out trash" value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frequency</label>
                  <select className="w-full h-10 px-3 rounded-md border" value={newChore.frequency} onChange={e => setNewChore({...newChore, frequency: e.target.value})}>
                    <option value="one-time">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign To</label>
                <div className="flex flex-wrap gap-2">
                  {activeGroup.members?.map(m => (
                    <div 
                      key={m.user.id} 
                      onClick={() => toggleAssignee(m.user.id)}
                      className={`px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                        newChore.assigneeIds.includes(m.user.id) 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {m.user.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Chore'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : chores.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No chores yet</h3>
          <p className="text-slate-500 mt-1">Add some chores to keep the flat sparkling clean!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chores.map((chore: any) => {
            const isCompleted = chore.assignments.length > 0 && chore.assignments.every((a: any) => a.status === 'completed');

            return (
              <Card key={chore.id} className={`transition-all ${isCompleted ? 'bg-slate-50/80 border-slate-200/60' : 'hover:border-blue-200'}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300" />
                      )}
                      <div>
                        <h3 className={`font-semibold text-lg ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{chore.title}</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-0.5 gap-2">
                          <span className="flex items-center gap-1 capitalize"><Clock className="w-3 h-3"/> {chore.frequency}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className={`capitalize ${chore.priority === 'high' ? 'text-red-500 font-medium' : ''}`}>{chore.priority} priority</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteMutation.mutate(chore.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {chore.assignments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Assignees</p>
                      <div className="space-y-2">
                        {chore.assignments.map((assignment: any) => (
                          <div key={assignment.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                {assignment.user.name.charAt(0)}
                              </div>
                              <span className={`text-sm ${assignment.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}>
                                {assignment.user.name}
                              </span>
                            </div>
                            {assignment.userId === user?.id && assignment.status !== 'completed' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs bg-white"
                                onClick={() => updateAssignmentMutation.mutate({ assignmentId: assignment.id, status: 'completed' })}
                                disabled={updateAssignmentMutation.isPending}
                              >
                                Mark Done
                              </Button>
                            )}
                            {assignment.status === 'completed' && (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Done
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Chores;
