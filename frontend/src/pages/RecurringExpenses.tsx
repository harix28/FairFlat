import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, Plus, Repeat } from 'lucide-react';

const RecurringExpenses = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recurring Expenses</h1>
          <p className="text-slate-500 mt-1">Automate your monthly rent, subscriptions, and utilities.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Recurring
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'House Rent', amount: 20000, frequency: 'Every Month on 1st', split: 'Equally (4 people)', active: true, next: 'Oct 1, 2026' },
          { title: 'Wi-Fi Bill', amount: 1000, frequency: 'Every Month on 15th', split: 'Equally (4 people)', active: true, next: 'Oct 15, 2026' },
          { title: 'Netflix', amount: 649, frequency: 'Every Month on 5th', split: 'Hari & Rahul', active: true, next: 'Oct 5, 2026' }
        ].map((item, i) => (
          <Card key={i} className="hover:border-blue-200 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-blue-500" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.split}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${item.active ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${item.active ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                </span>
                <span className="text-sm text-slate-500">{item.active ? 'Active' : 'Paused'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-slate-900">₹{item.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                <span className="font-medium">{item.frequency}</span>
                <span className="ml-auto text-slate-400">Next: {item.next}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecurringExpenses;
