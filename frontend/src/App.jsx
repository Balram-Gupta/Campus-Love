import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AiSupportChat from "./components/AiSupportChat.jsx";
import { useAuth } from "./state/AuthContext.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const UploadIdPage = lazy(() => import("./pages/UploadIdPage.jsx"));
const PendingPage = lazy(() => import("./pages/PendingPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const SwipePage = lazy(() => import("./pages/SwipePage.jsx"));
const MatchesPage = lazy(() => import("./pages/MatchesPage.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage.jsx"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage.jsx"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage.jsx"));

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader-card">
        <span className="page-loader-spinner" aria-hidden="true" />
        <p>Loading page...</p>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="p-8 text-campus-muted">Checking session...</p>;
  }
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  if (user) {
    return <Navigate to="/swipe" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <div className="route-transition" key={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/upload-id" element={<UploadIdPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<AppLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/swipe" element={<SwipePage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/chat/:matchId?" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<HomeRoute />} />
          </Routes>
        </Suspense>
      </div>
      <AiSupportChat />
    </>
  );
}
