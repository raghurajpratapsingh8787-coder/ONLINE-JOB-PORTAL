import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getDashboardPathForRole } from './lib/format';
import type { UserRole } from './types';

import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { HomePage } from './pages/public/HomePage';
import { FindJobsPage } from './pages/public/FindJobsPage';
import { JobDetailPage } from './pages/public/JobDetailPage';
import {
  AboutPage,
  CategoriesPage,
  CompaniesPage,
  ResourcesPage,
} from './pages/public/SecondaryPublicPages';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/auth/AuthPages';

import { CandidateOverview } from './pages/candidate/CandidateOverview';
import { CandidateProfilePage } from './pages/candidate/CandidateProfilePage';
import { CandidateApplicationsPage } from './pages/candidate/CandidateApplicationsPage';
import {
  CandidateSavedJobsPage,
  ResumeManagerPage,
} from './pages/candidate/CandidateSavedAndResumes';

import {
  EmployerCompanyPage,
  EmployerOverview,
} from './pages/employer/EmployerOverviewAndCompany';
import { EmployerJobsPage } from './pages/employer/EmployerJobsPage';
import {
  EmployerATSPage,
  EmployerInterviewsPage,
} from './pages/employer/EmployerATSAndInterviews';

import { AdminOverview } from './pages/admin/AdminOverview';
import {
  AdminAuditLogsPage,
  AdminModerationPage,
  AdminPlatformSettingsPage,
  AdminTaxonomyPage,
  AdminUsersPage,
} from './pages/admin/AdminManagementPages';

import {
  AccountSettingsPage,
  MessagesPage,
  NotificationsPage,
} from './pages/shared/CollabPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Public Portal */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/jobs" element={<FindJobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Role-Aware Redirect */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Candidate Workspace */}
            <Route
              path="/dashboard/candidate"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CandidateOverview />} />
              <Route path="profile" element={<CandidateProfilePage />} />
              <Route path="saved" element={<CandidateSavedJobsPage />} />
              <Route path="applications" element={<CandidateApplicationsPage />} />
              <Route path="resumes" element={<ResumeManagerPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<AccountSettingsPage />} />
            </Route>

            {/* Employer / Recruiter Workspace */}
            <Route
              path="/dashboard/employer"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EmployerOverview />} />
              <Route path="company" element={<EmployerCompanyPage />} />
              <Route path="jobs" element={<EmployerJobsPage />} />
              <Route path="ats" element={<EmployerATSPage />} />
              <Route path="interviews" element={<EmployerInterviewsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<AccountSettingsPage />} />
            </Route>

            {/* Super Admin Console */}
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="taxonomy" element={<AdminTaxonomyPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<AdminPlatformSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
