import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="p-8 text-campus-muted">Checking admin session...</p>;
  }
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/login" replace />;
}
