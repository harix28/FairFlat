import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Receipt, PieChart, LogOut, Bell, Repeat, BarChart3 } from 'lucide-react';
import { FairBot } from '../components/FairBot';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppContext } from '../context/AppContext';

const Layout = () => {
  const location = useLocation();
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const { user } = useAppContext();

  useEffect(() => {
    // Attempt to connect to backend server for notifications
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      // Assuming 'group-1' as the default mock group
      socket.emit('join_group', 'group-1');
    });

    socket.on('new_expense', (expense: any) => {
      setHasNewNotification(true);
      setNotifications(prev => [`New expense added: ₹${expense.amount} for ${expense.title}`, ...prev]);
    });

    // Mock an event coming in after 5 seconds for demo purposes
    const timer = setTimeout(() => {
      setHasNewNotification(true);
      setNotifications(prev => ['Aman just added a ₹500 Swiggy bill', ...prev]);
    }, 5000);

    return () => {
      socket.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: Home },
    { name: 'Expenses', path: '/app/expenses', icon: Receipt },
    { name: 'Settlements', path: '/app/settlements', icon: PieChart },
    { name: 'Recurring', path: '/app/recurring', icon: Repeat },
    { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { name: 'Groups', path: '/app/groups', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">F</div>
            FairFlat
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Link 
            to="/" 
            onClick={() => localStorage.removeItem('token')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="md:hidden text-xl font-bold text-blue-600">FairFlat</div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setHasNewNotification(false);
                if (notifications.length > 0) alert(notifications.join('\n'));
                else alert('No new notifications');
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {hasNewNotification && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 -z-10 pointer-events-none rounded-b-[3rem]"></div>
          <Outlet />
        </main>
      </div>

      <FairBot />

      {/* Mobile nav (bottom) */}
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-50 flex justify-around p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-lg ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Layout;
