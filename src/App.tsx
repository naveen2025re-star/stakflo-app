import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from '@cloudscape-design/components/spinner';
import Box from '@cloudscape-design/components/box';
import type { ReactNode } from 'react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FrameworksPage = lazy(() => import('./pages/FrameworksPage'));
const ControlsPage = lazy(() => import('./pages/ControlsPage'));
const EvidencePage = lazy(() => import('./pages/EvidencePage'));
const AuditsPage = lazy(() => import('./pages/AuditsPage'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
const RemediationPage = lazy(() => import('./pages/RemediationPage'));
const TrustCenterPage = lazy(() => import('./pages/TrustCenterPage'));
const TrustCenterPublicPage = lazy(() => import('./pages/TrustCenterPublicPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoader() {
  return (
    <Box textAlign="center" padding="xxl">
      <Spinner size="large" />
    </Box>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/welcome" element={<GuestRoute><LandingPage /></GuestRoute>} />
              <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/trust/:slug" element={
                <ErrorBoundary>
                  <TrustCenterPublicPage />
                </ErrorBoundary>
              } />
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="frameworks" element={<ErrorBoundary><FrameworksPage /></ErrorBoundary>} />
                <Route path="controls" element={<ErrorBoundary><ControlsPage /></ErrorBoundary>} />
                <Route path="evidence" element={<ErrorBoundary><EvidencePage /></ErrorBoundary>} />
                <Route path="audits" element={<ErrorBoundary><AuditsPage /></ErrorBoundary>} />
                <Route path="vendors" element={<ErrorBoundary><VendorsPage /></ErrorBoundary>} />
                <Route path="policies" element={<ErrorBoundary><PoliciesPage /></ErrorBoundary>} />
                <Route path="remediation" element={<ErrorBoundary><RemediationPage /></ErrorBoundary>} />
                <Route path="integrations" element={<ErrorBoundary><IntegrationsPage /></ErrorBoundary>} />
                <Route path="team" element={<ErrorBoundary><TeamPage /></ErrorBoundary>} />
                <Route path="trust-center" element={<ErrorBoundary><TrustCenterPage /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              </Route>
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
