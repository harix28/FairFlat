import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  // Check if token exists in localStorage
  const isAuthenticated = !!localStorage.getItem('token');
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};
