import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useI18n } from "../../shared/i18n";

export function AdminRoute() {
  const { initialized, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { t } = useI18n();

  if (!initialized) {
    return <div className="page page-center">{t("app.checkingSession")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
