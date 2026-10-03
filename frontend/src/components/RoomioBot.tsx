import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
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
interface RoomioBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomioBot({ isOpen, onClose }: RoomioBotProps) {
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
      const res = await botApi.chat({ text: userMessage });
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

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 left-4 md:left-auto md:bottom-8 md:right-8 md:w-[350px] h-[60vh] md:h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg">RoomioBot</span>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
              {msg.isActionable && (
                <div className="mt-3 flex gap-2">
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

                      // Map string names back to user objects
                      // Mock approach: just assume all members of activeGroup participate
                      const participants = activeGroup.members?.map(m => ({ userId: m.user.id })) || [];
                      let payerId = user?.id; // default to current user
                      
                      if (intent.payer.toLowerCase() !== 'you' && intent.payer.toLowerCase() !== 'i') {
                        const matchedMember = activeGroup.members?.find(m => m.user.name.toLowerCase() === intent.payer.toLowerCase());
                        if (matchedMember) payerId = matchedMember.user.id;
                      }

                      expenseMutation.mutate({
                        title: intent.title || 'Added by RoomioBot',
                        amount: intent.amount,
                        payerId: payerId,
                        splitType: intent.splitType || 'equal',
                        participants: participants
                      });
                      
                      // Remove buttons
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
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. I paid 500 for milk..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
