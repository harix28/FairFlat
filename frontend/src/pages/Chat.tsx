import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const Chat = () => {
  const { activeGroup, user } = useAppContext();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', activeGroup?.id],
    queryFn: async () => {
      const res = await api.get(`/groups/${activeGroup?.id}/messages`);
      return res.data;
    },
    enabled: !!activeGroup?.id,
    refetchInterval: 3000 // Poll every 3 seconds as a fallback to WebSockets
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createMutation = useMutation({
    mutationFn: async (text: string) => await api.post(`/groups/${activeGroup?.id}/messages`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', activeGroup?.id] });
      setText('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => await api.delete(`/groups/${activeGroup?.id}/messages/${messageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', activeGroup?.id] })
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createMutation.mutate(text);
  };

  if (!activeGroup) return <div className="p-8 text-center text-slate-500">Select a group first.</div>;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Household Chat</h1>
        <p className="text-slate-500 mt-1">Discuss bills, chores, and flatmate stuff here.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Start the conversation!
              </div>
            ) : (
              messages.map((msg: any) => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] md:max-w-[60%] flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium shadow-sm flex-shrink-0 text-xs">
                        {msg.user.name.charAt(0)}
                      </div>
                      <div className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <button 
                              onClick={() => deleteMutation.mutate(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        )}
        
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 h-12 px-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
              placeholder="Type your message..." 
              value={text} 
              onChange={e => setText(e.target.value)} 
            />
            <Button type="submit" className="h-12 w-12 rounded-full p-0 flex items-center justify-center" disabled={createMutation.isPending || !text.trim()}>
              {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Chat;
