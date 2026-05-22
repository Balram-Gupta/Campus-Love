import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="p-8 text-campus-muted">Checking session...</p>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
