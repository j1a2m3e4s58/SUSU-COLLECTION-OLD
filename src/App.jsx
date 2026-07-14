import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const FieldCollection = lazy(() => import('@/pages/FieldCollection'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Reports = lazy(() => import('@/pages/Reports'));
const AgentManagement = lazy(() => import('@/pages/AgentManagement'));
const BranchManagement = lazy(() => import('@/pages/BranchManagement'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));
const Profile = lazy(() => import('@/pages/Profile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const PortalControl = lazy(() => import('@/pages/PortalControl'));
const UsersAccess = lazy(() => import('@/pages/UsersAccess'));
const CustomersHub = lazy(() => import('@/pages/CustomersHub'));

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
  </div>
);

const RequireAdmin = ({ children }) => {
  const { user } = useAuth();
  const allowed = user?.role === 'OwnerAdmin';
  return allowed ? children : <Navigate to="/" replace />;
};

const RequireOwner = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'OwnerAdmin' ? children : <Navigate to="/" replace />;
};

const RequireSusuAgent = ({ children }) => {
  const { user } = useAuth();
  const allowed = String(user?.department || '').trim().toUpperCase() === 'SUSU AGENT';
  return allowed ? children : <Navigate to="/" replace />;
};

const RequireCustomerManager = ({ children }) => {
  const { user } = useAuth();
  const allowed = user?.role === 'OwnerAdmin' || user?.role === 'Supervisor';
  return allowed ? children : <Navigate to="/" replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/field-collection" element={<RequireSusuAgent><FieldCollection /></RequireSusuAgent>} />
          <Route path="/customers" element={<RequireCustomerManager><CustomersHub /></RequireCustomerManager>} />
          <Route path="/inactive-customers" element={<RequireCustomerManager><CustomersHub /></RequireCustomerManager>} />
          <Route path="/directory" element={<UsersAccess />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/agents" element={<RequireCustomerManager><AgentManagement /></RequireCustomerManager>} />
          <Route path="/branches" element={<RequireAdmin><BranchManagement /></RequireAdmin>} />
          <Route path="/audit-log" element={<RequireAdmin><AuditLog /></RequireAdmin>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/portal-control" element={<RequireOwner><PortalControl /></RequireOwner>} />
          <Route path="/supervisor-management" element={<Navigate to="/directory?tab=supervisors" replace />} />
          <Route path="/past-staff" element={<Navigate to="/directory?tab=archived" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
