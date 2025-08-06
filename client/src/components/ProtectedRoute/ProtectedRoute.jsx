import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import './ProtectedRoute.css';

const ProtectedRoute = () => {
  const { user, status } = useSelector((state) => state.auth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Simulate auth check delay
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isCheckingAuth || status === 'loading') {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="protected-route-container">
        <div className="redirect-message">
          <p>You need to be logged in to access this page.</p>
          <p>Redirecting to login...</p>
        </div>
        <Navigate to="/login" replace />
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;