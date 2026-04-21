import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export function ProtectedRoute() {
  const { initialized, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!initialized) {
    return <div className="page page-center">Loading protected route...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
