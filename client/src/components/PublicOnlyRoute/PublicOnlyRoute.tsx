import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useI18n } from "../../shared/i18n";
import { PageLoader } from "../Preloader/Preloader";

export function PublicOnlyRoute() {
  const { t } = useI18n();
  const { initialized, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!initialized) {
    return <PageLoader label={t("app.checkingSession")} className="page-loader--fullscreen" />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
