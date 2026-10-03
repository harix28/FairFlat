import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { botApi, expenseApi } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  isActionable?: boolean;
  actionData?: any;
}

const RoomioBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Hi Hari! I can help you add expenses, check balances, or settle up. Just ask!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeGroup, user } = useAppContext();
  const queryClient = useQueryClient();

  const expenseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!activeGroup?.id) throw new Error('No active group');
      return expenseApi.createExpense(activeGroup.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'Expense successfully added! 🎉' }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'Failed to add the expense. Please try again or use the manual form.' }]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const res = await botApi.chat({ text: userMessage, groupId: activeGroup?.id });
      const intent = res.data.result;
      
      let botResponse = intent.reply || "I didn't quite catch that. Can you rephrase?";
      let isActionable = false;

      if (intent.intent === 'CREATE_EXPENSE') {
        isActionable = true;
      }

      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: botResponse, isActionable, actionData: intent }]);
        setIsTyping(false);
      }, 1000); // Simulate network delay
    } catch (err) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: "Sorry, I'm having trouble connecting right now." }]);
        setIsTyping(false);
      }, 1000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-12rem)] md:h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-600" />
          RoomioBot
        </h1>
        <p className="text-slate-500 mt-1">Your AI assistant for managing expenses and tasks.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[60%] flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white' 
                    : 'bg-white border border-slate-200'
                }`}>
                  {msg.sender === 'user' ? (user?.name?.charAt(0) || 'U') : <Bot className="w-5 h-5 text-blue-600" />}
                </div>
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                    {msg.isActionable && (
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 w-full text-white"
                          onClick={() => {
                            if (!activeGroup) {
                               setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'You need to select a group first!' }]);
                               return;
                            }
                            
                            const intent = msg.actionData;
                            if (!intent) return;

                            let participants: {userId: string, share?: number}[] = activeGroup.members?.map(m => ({ userId: m.user.id })) || [];
                            let payerId = user?.id;
                            
                            if (intent.payer && !['you', 'i', 'meine', 'me'].includes(intent.payer.toLowerCase())) {
                              const matchedMember = activeGroup.members?.find(m => m.user.name.toLowerCase().includes(intent.payer.toLowerCase()) || intent.payer.toLowerCase().includes(m.user.name.toLowerCase()));
                              if (matchedMember) payerId = matchedMember.user.id;
                            }

                            if (intent.splitType === 'custom' && intent.splitDetails) {
                              const newParticipants: {userId: string, share: number}[] = [];
                              intent.splitDetails.forEach((detail: any) => {
                                let targetUserId = user?.id;
                                if (!['you', 'i', 'meine', 'mein', 'me'].includes(detail.name.toLowerCase())) {
                                  const matchedMember = activeGroup.members?.find(m => m.user.name.toLowerCase().includes(detail.name.toLowerCase()) || detail.name.toLowerCase().includes(m.user.name.toLowerCase()));
                                  if (matchedMember) targetUserId = matchedMember.user.id;
                                }
                                if (targetUserId) {
                                  // Avoid duplicate pushes
                                  if (!newParticipants.find(p => p.userId === targetUserId)) {
                                    newParticipants.push({ userId: targetUserId, share: detail.amount });
                                  }
                                }
                              });
                              if (newParticipants.length > 0) {
                                participants = newParticipants;
                              } else {
                                intent.splitType = 'equal'; // fallback
                              }
                            }

                            expenseMutation.mutate({
                              title: intent.title || 'Added by RoomioBot',
                              amount: intent.amount,
                              payerId: payerId,
                              splitType: intent.splitType || 'equal',
                              participants: participants
                            });
                            
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isActionable: false } : m));
                          }}
                          disabled={expenseMutation.isPending}
                        >
                          {expenseMutation.isPending ? 'Saving...' : 'Confirm'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs w-full" onClick={() => {
                          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isActionable: false } : m));
                          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'Action cancelled.' }]);
                        }}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] flex gap-2 flex-row">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex flex-col items-start">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 h-12 px-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
              placeholder="Message RoomioBot..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
            />
            <Button type="submit" className="h-12 w-12 rounded-full p-0 flex items-center justify-center" disabled={!input.trim()}>
              <Send className="w-5 h-5 ml-1" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default RoomioBot;
