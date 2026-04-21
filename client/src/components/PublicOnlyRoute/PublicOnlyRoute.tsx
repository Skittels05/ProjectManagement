import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export function PublicOnlyRoute() {
  const { initialized, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!initialized) {
    return <div className="page page-center">Loading auth page...</div>;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
