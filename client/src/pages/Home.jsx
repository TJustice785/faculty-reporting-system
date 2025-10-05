import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import Dashboard from './Dashboard.jsx';

// Role-aware landing: admins see AdminDashboard; others see normal Dashboard
export default function Home() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role === 'admin') {
    return <AdminDashboard />;
  }
  return <Dashboard />;
}
