import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import AuthForm from './components/Auth/AuthForm';
import LandingPage from './components/Landing/LandingPage';
import ToastContainer from './components/UI/ToastContainer';
import { useToast } from './hooks/useToast';

// Lazy load components
const OnboardingFlow = React.lazy(() => import('./components/Onboarding/OnboardingFlow'));
const Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard'));
const LessonsList = React.lazy(() => import('./components/Lessons/LessonsList'));
const LessonView = React.lazy(() => import('./components/Lessons/LessonView'));
const RoadmapView = React.lazy(() => import('./components/Roadmap/RoadmapView'));
const ProfileView = React.lazy(() => import('./components/Profile/ProfileView'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, isNewUser, loading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={
          loading ? null : user ? (
            <Navigate to={isNewUser ? "/onboarding" : "/dashboard"} replace />
          ) : (
            <AuthForm />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Suspense fallback={null}>
              <OnboardingFlow />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <Dashboard />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <LessonsList />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:lessonId"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <LessonView />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/roadmap"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <RoadmapView />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <ProfileView />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={null}>
                <AdminDashboard />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-200">
            <AppRoutes />
            <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
