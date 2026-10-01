import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import Settlements from './pages/Settlements';
import RecurringExpenses from './pages/RecurringExpenses';
import Analytics from './pages/Analytics';
import Layout from './layouts/Layout';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppProvider } from './context/AppContext';

const queryClient = new QueryClient();

function App() {
  return (
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
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AppProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
