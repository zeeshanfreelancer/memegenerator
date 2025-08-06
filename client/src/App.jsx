import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { store } from './store/store';
import { loadUser, clearAuthError } from './store/authSlice';

import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage/HomePage';
import MemeGenerator from './pages/MemeGenerator/MemeGenerator';
import TemplatesImportPage from './pages/TemplatesImportPage/TemplatesImportPage';
import MyMemesPage from './pages/MyMemesPage/MyMemesPage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import TemplateUploadPage from './pages/TemplateUploadPage/TemplateUploadPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import TemplatesPage from './components/TemplatesPage/TemplatesPage';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  '533615790361-1hn2r97ipcpvorj4m4vdr8p6srabgshd.apps.googleusercontent.com';

const AppWrapper = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const { error: authError } = useSelector((state) => state.auth);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (token) {
          await dispatch(loadUser()).unwrap();
        }
      } catch (error) {
        console.error('User load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      // Clear any auth errors when component unmounts
      dispatch(clearAuthError());
    };
  }, [dispatch, token]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public Routes */}
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/import" element={<TemplatesImportPage />} />
            <Route path="create" element={<MemeGenerator />} />
            <Route path="create/:templateId" element={<MemeGenerator />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="my-memes" element={<MyMemesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="upload-template" element={<TemplateUploadPage />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </ErrorBoundary>
  );
};

const NotFoundPage = () => (
  <div className="not-found">
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
  </div>
);

const App = () => (
  <Provider store={store}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppWrapper />
    </GoogleOAuthProvider>
  </Provider>
);

export default App;