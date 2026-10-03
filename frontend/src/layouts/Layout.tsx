import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Receipt, PieChart, LogOut, Bell, Repeat, BarChart3, ListTodo, ShoppingCart, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { FairBot } from '../components/FairBot';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppContext } from '../context/AppContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/api';

const Layout = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, activeGroup, logout } = useAppContext();

  // Fetch real notifications from database
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationApi.getNotifications();
      return res.data;
    },
    enabled: !!user
  });

  useEffect(() => {
    // Attempt to connect to backend server for live notifications
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    if (user) {
      socket.emit('join_user', user.id);
    }
    
    // Connect to active group channel
    const activeGroupId = localStorage.getItem('fairflat_active_group');
    if (activeGroupId) {
      socket.emit('join_group', activeGroupId);
    }

    socket.on('new_notification', () => {
      setHasNewNotification(true);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('new_expense', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroupId] });
    });

    socket.on('expense_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroupId] });
    });

    socket.on('payment_recorded', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', activeGroupId] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: Home },
    { name: 'Expenses', path: '/app/expenses', icon: Receipt, requiresGroup: true },
    { name: 'Settlements', path: '/app/settlements', icon: PieChart, requiresGroup: true },
    { name: 'Recurring', path: '/app/recurring', icon: Repeat, requiresGroup: true },
    { name: 'Chores', path: '/app/chores', icon: ListTodo, requiresGroup: true },
    { name: 'Shopping', path: '/app/shopping', icon: ShoppingCart, requiresGroup: true },
    { name: 'Chat', path: '/app/chat', icon: MessageSquare, requiresGroup: true },
    { name: 'Analytics', path: '/app/analytics', icon: BarChart3, requiresGroup: true },
    { name: 'Groups', path: '/app/groups', icon: Users },
    { name: 'Settings', path: '/app/settings', icon: SettingsIcon },
  ].filter(item => !item.requiresGroup || activeGroup);

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
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="md:hidden text-xl font-bold text-blue-600">FairFlat</div>
          <div className="flex-1" />
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => {
                setHasNewNotification(false);
                setShowNotifications(!showNotifications);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {hasNewNotification && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute top-12 right-12 w-80 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-96">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                    <button 
                      onClick={async () => {
                        await notificationApi.markAllAsRead();
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                        <Bell className="w-8 h-8 text-slate-300 mb-2" />
                        You're all caught up!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notif: any) => (
                          <div key={notif.id} className={`p-4 transition-colors text-sm text-slate-700 flex flex-col gap-1 cursor-pointer ${notif.read ? 'opacity-60 bg-white' : 'bg-blue-50/50 hover:bg-slate-50'}`}
                            onClick={async () => {
                               if (!notif.read) {
                                 await notificationApi.markAsRead(notif.id);
                                 queryClient.invalidateQueries({ queryKey: ['notifications'] });
                               }
                            }}
                          >
                            <span className="font-semibold">{notif.title}</span>
                            <span>{notif.message}</span>
                            <span className="text-xs text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Link to="/app/settings" className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-medium shadow-sm hover:opacity-90 transition-opacity">
              {user?.name?.charAt(0) || 'U'}
            </Link>
            <button 
              onClick={() => logout()}
              className="md:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 relative">
          <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 -z-10 pointer-events-none rounded-b-[3rem]"></div>
          <Outlet />
        </main>
      </div>

      <FairBot />

      {/* Mobile nav (bottom) */}
      <div 
        className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-50 flex overflow-x-auto gap-4 px-4 p-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .md\\:hidden::-webkit-scrollbar { display: none; }
        `}</style>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[64px] flex-shrink-0 p-2 rounded-lg ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
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
