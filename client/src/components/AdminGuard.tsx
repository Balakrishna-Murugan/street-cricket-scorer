import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  if (!isAdmin) {
    // Redirect non-admin users to matches page (view only)
    return <Navigate to="/matches" />;
  }

  return <>{children}</>;
};

export default AdminGuard;