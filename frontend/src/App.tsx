import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/authContext';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AcceptInvitationPage from './pages/auth/AcceptInvitationPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import Atelier1Page from './pages/projects/Atelier1Page';
import GouvernancePage from './pages/projects/GouvernancePage';
import MissionsPage from './pages/missions/MissionsPage';

import AdminUsersPage from './pages/admin/AdminUsersPage';
import NotificationsPage from './pages/notifications/NotificationsPage';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 bg-[rgba(142,211,255,0.2)]">{children}</main>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
              padding: '14px 16px',
              fontSize: '14px',
            },
            classNames: {
              toast: '!bg-white !text-foreground',
              success: '!border-green-200',
              error: '!border-red-200',
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Navigate to="/dashboard" replace />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjectsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id/atelier-1"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'CHEF_PROJET', 'CONSULTANT']}>
                <MainLayout>
                  <Atelier1Page />
                </MainLayout>
              </ProtectedRoute>
            }
          />

<Route
            path="/projects/:id/gouvernance"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'CHEF_PROJET', 'CONSULTANT']}>
                <MainLayout>
                  <GouvernancePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions"
            element={
              <ProtectedRoute requiredRoles={['CONSULTANT']}>
                <MainLayout>
                  <MissionsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <MainLayout>
                  <AdminUsersPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

