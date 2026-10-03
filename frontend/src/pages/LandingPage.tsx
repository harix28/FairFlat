import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, CheckCircle2, Zap, Scale } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex justify-between items-center">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">F</div>
          Roomio
        </div>
        <nav className="hidden md:flex gap-6 items-center">
          <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium">Features</a>
          <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 font-medium">How it works</a>
          <Button variant="ghost" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth?signup=true">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center text-center px-4 pt-20 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100">
          <Zap className="w-4 h-4" />
          <span>The smart way to share expenses</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
          Don't split equally. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Split fairly.
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          The ultimate AI-powered expense management platform for students, roommates, and groups. Stop fighting over bills and start splitting them accurately based on who actually consumed what.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="h-14 px-8 text-lg" asChild>
            <Link to="/auth?signup=true">
              Start for free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white">
            See Demo
          </Button>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left w-full">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Item-Level Fairness</h3>
            <p className="text-slate-600">Assign specific items from a restaurant bill to specific people. Only pay for what you ordered.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Receipt Scanner</h3>
            <p className="text-slate-600">Just snap a picture of your receipt. Our AI extracts items, prices, and taxes automatically.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Settlements</h3>
            <p className="text-slate-600">We calculate the absolute minimum number of transactions needed to settle all debts in your group.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
