import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import AuthForm from './components/Auth/AuthForm';

// Lazy load components for better performance
const OnboardingFlow = React.lazy(() => import('./components/Onboarding/OnboardingFlow'));
const Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard'));
const LessonsList = React.lazy(() => import('./components/Lessons/LessonsList'));
const LessonView = React.lazy(() => import('./components/Lessons/LessonView'));
const RoadmapView = React.lazy(() => import('./components/Roadmap/RoadmapView'));
const ProfileView = React.lazy(() => import('./components/Profile/ProfileView'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading, isNewUser } = useAuth();

  // Show loading spinner while auth is initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to={isNewUser ? "/onboarding" : "/dashboard"} replace /> : <AuthForm />} 
        />
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/lessons" 
          element={
            <ProtectedRoute>
              <Layout>
                <LessonsList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/lessons/:lessonId" 
          element={
            <ProtectedRoute>
              <Layout>
                <LessonView />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/roadmap" 
          element={
            <ProtectedRoute>
              <Layout>
                <RoadmapView />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <ProfileView />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;