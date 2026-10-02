import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';

import Groups from './pages/Groups';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import Settlements from './pages/Settlements';
import RecurringExpenses from './pages/RecurringExpenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Chores from './pages/Chores';
import Shopping from './pages/Shopping';
import Chat from './pages/Chat';
import Activity from './pages/Activity';
import Layout from './layouts/Layout';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppProvider } from './context/AppContext';

const queryClient = new QueryClient();

function App() {
  return (
    <ToastProvider>
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppProvider>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="groups" element={<Groups />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="expenses/new" element={<AddExpense />} />
              <Route path="settlements" element={<Settlements />} />
              <Route path="recurring" element={<RecurringExpenses />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="chores" element={<Chores />} />
              <Route path="shopping" element={<Shopping />} />
              <Route path="chat" element={<Chat />} />
<Route path="activity" element={<Activity />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AppProvider>
      </Router>
    </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
