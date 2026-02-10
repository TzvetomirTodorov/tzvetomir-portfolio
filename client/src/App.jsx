import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/authStore';

// Layout
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Animals from './pages/Animals';
import AnimalDetail from './pages/AnimalDetail';
import Clinics from './pages/Clinics';
import ClinicDetail from './pages/ClinicDetail';
import Shifts from './pages/Shifts';
import MySchedule from './pages/MySchedule';
import Users from './pages/Users';
import Profile from './pages/Profile';
import AdminRequests from './pages/AdminRequests';
import Volunteers from './pages/Volunteers';
import Help from './pages/Help';
import NotFound from './pages/NotFound';

// Components
import OnboardingModal, { hasCompletedOnboarding } from './components/onboarding/OnboardingModal';
import HelpButton from './components/common/HelpButton';

// Protected Route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/30">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route wrapper (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/30">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { fetchUser, accessToken, setLoading, isLoading, isAuthenticated, user } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (accessToken && !initialized) {
        setInitialized(true);
        await fetchUser();
      } else if (!accessToken) {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, [accessToken, initialized]);

  // Check if we should show onboarding after user is authenticated
  useEffect(() => {
    if (isAuthenticated && initialized && user?.id && !hasCompletedOnboarding(user.id)) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, initialized, user?.id]);

  // Handle restart tour from help button
  const handleRestartTour = () => {
    setShowOnboarding(true);
  };

  // Show loading only on first load
  if (isLoading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/30">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* ────── Landing page (public, but redirects to dashboard if logged in) ────── */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* ────── Auth routes (login, register, etc.) ────── */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* ────── Protected routes (authenticated users only) ────── */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/animals" element={<Animals />} />
          <Route path="/animals/:id" element={<AnimalDetail />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/clinics/:id" element={<ClinicDetail />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help" element={<Help />} />
          
          {/* Admin only routes */}
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute adminOnly>
                <AdminRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteers"
            element={
              <ProtectedRoute adminOnly>
                <Volunteers />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ────── 404 ────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Onboarding Modal - Shows for first-time users */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)}
        userName={user?.firstName || 'there'}
        userId={user?.id}
      />

      {/* Floating Help Button - Only show when authenticated */}
      {isAuthenticated && (
        <HelpButton onRestartTour={handleRestartTour} userId={user?.id} />
      )}
    </>
  );
}

export default App;
