import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import OtpPage from "./pages/OtpPage.jsx";
import UploadIdPage from "./pages/UploadIdPage.jsx";
import PendingPage from "./pages/PendingPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SwipePage from "./pages/SwipePage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import ReportsPage from "./pages/admin/ReportsPage.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AiSupportChat from "./components/AiSupportChat.jsx";
import { useAuth } from "./state/AuthContext.jsx";

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
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
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
      <AiSupportChat />
    </>
  );
}
