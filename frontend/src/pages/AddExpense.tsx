import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Camera, Receipt, List, PieChart, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { scanReceipt, createExpense } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const AddExpense = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [splitType, setSplitType] = useState('equal');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  
  const { user, activeGroup } = useAppContext();
  
  const mutation = useMutation({
    mutationFn: (newExpense: any) => createExpense(activeGroup?.id || '', newExpense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroup?.id] });
      navigate('/app/expenses');
    },
  });

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const data: any = await scanReceipt(file);
      setScannedData(data);
      setSplitType('itemized');
      setTitle(data.merchant);
      setAmount(data.total.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = () => {
    if (!activeGroup) return alert('No active group');

    // Create payload
    const participants = activeGroup.members?.map(m => ({ userId: m.user.id })) || [];
    
    const payload: any = {
      title,
      amount: parseFloat(amount),
      splitType,
      payerId: user?.id,
      participants
    };
    
    if (splitType === 'itemized' && scannedData) {
      payload.items = scannedData.items.map((item: any) => ({
        ...item,
        participants: participants.map(p => p.userId) // Default all involved
      }));
      payload.tax = scannedData.tax;
      payload.serviceCharge = scannedData.serviceCharge;
    }
    
    mutation.mutate(payload);
  };
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          &larr;
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Add Expense</h1>
          <p className="text-slate-500 mt-1">Split a new bill fairly among the group.</p>
        </div>
      </div>

      {!scannedData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all border-dashed border-2 relative"
          >
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleScan}
              disabled={isScanning}
            />
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-full">
              {isScanning ? (
                <>
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Extracting data...</h3>
                    <p className="text-sm text-slate-500 mt-1">FairBot AI is analyzing your receipt</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Scan Bill with AI</h3>
                    <p className="text-sm text-slate-500 mt-1">Upload a receipt and let AI extract the items automatically</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all border-dashed border-2">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-full">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">Manual Entry</h3>
                <p className="text-sm text-slate-500 mt-1">Enter total amount or list items manually</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scannedData && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4 mb-8">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-emerald-900">Receipt Extracted Successfully!</h4>
            <p className="text-emerald-700 text-sm mt-1">We found {scannedData.items.length} items from {scannedData.merchant} totaling ₹{scannedData.total}. Assign participants to each item below.</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto text-emerald-700" onClick={() => setScannedData(null)}>
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>Enter the basic information about this expense</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title or Merchant</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ABC Restaurant or Monthly Groceries"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Total Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
              <input 
                type="number" 
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium mb-2 block">How should this be split?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-colors ${splitType === 'equal' ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setSplitType('equal')}
              >
                <Users className="w-5 h-5" />
                Equally
              </button>
              <button 
                className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-colors ${splitType === 'itemized' ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setSplitType('itemized')}
              >
                <List className="w-5 h-5" />
                By Item
              </button>
              <button 
                className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-colors ${splitType === 'percentage' ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setSplitType('percentage')}
              >
                <PieChart className="w-5 h-5" />
                Percentage
              </button>
              <button 
                className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-colors ${splitType === 'custom' ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setSplitType('custom')}
              >
                <span className="font-bold text-lg font-mono">₹</span>
                Exact Amt
              </button>
            </div>
          </div>
          
          {splitType === 'itemized' && scannedData && (
            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-3 border-b border-slate-200 text-sm font-medium text-slate-600 flex justify-between">
                <span>Items</span>
                <span>Participants</span>
              </div>
              <div className="divide-y divide-slate-100">
                {scannedData.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-slate-500">₹{item.price} • Qty: {item.quantity}</div>
                    </div>
                    <div className="flex gap-2">
                      {activeGroup?.members?.map((m) => (
                        <div key={m.user.id} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors bg-blue-600 text-white">
                          {m.user.name.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Expense
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddExpense;
