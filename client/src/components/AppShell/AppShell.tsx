import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useLogoutMutation, useRefreshMutation } from "../../store/api/authApi";
import { PreferencesMenu } from "../PreferencesMenu/PreferencesMenu";
import { useI18n } from "../../shared/i18n";
import "./AppShell.css";

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppShell() {
  const location = useLocation();
  const { initialized, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [refreshSession] = useRefreshMutation();
  const [logout] = useLogoutMutation();
  const { t } = useI18n();

  useEffect(() => {
    if (!initialized) {
      void refreshSession();
    }
  }, [initialized, refreshSession]);

  if (!initialized) {
    return <div className="page page-center">{t("app.checkingSession")}</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="topbar-brand">
          <span className="eyebrow">{t("app.eyebrow")}</span>
        </Link>
        <nav className="topbar-actions">
          {isAuthenticated ? (
            <>
              <Link
                to="/"
                className={
                  location.pathname === "/" || location.pathname.startsWith("/projects")
                    ? "active-link"
                    : ""
                }
              >
                {t("app.dashboard")}
              </Link>
              <span className="user-chip">{user?.fullName ?? user?.email}</span>
            </>
          ) : (
            <>
              <Link to="/login" className={location.pathname === "/login" ? "active-link" : ""}>
                {t("app.login")}
              </Link>
              <Link to="/register" className={location.pathname === "/register" ? "active-link" : ""}>
                {t("app.register")}
              </Link>
            </>
          )}
          <PreferencesMenu />
          {isAuthenticated ? (
            <button
              type="button"
              className="topbar-icon-btn topbar-icon-btn--logout"
              onClick={() => void logout()}
              aria-label={t("app.signOut")}
              title={t("app.signOut")}
            >
              <LogoutIcon />
            </button>
          ) : null}
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
