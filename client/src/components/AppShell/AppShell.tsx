import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useLogoutMutation, useRefreshMutation } from "../../store/api/authApi";
import { PreferencesMenu } from "../PreferencesMenu/PreferencesMenu";
import { useI18n } from "../../shared/i18n";
import { PageLoader } from "../Preloader/Preloader";
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

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function AppShell() {
  const location = useLocation();
  const topbarRef = useRef<HTMLElement>(null);
  const { initialized, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [refreshSession] = useRefreshMutation();
  const [logout] = useLogoutMutation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!initialized) {
      void refreshSession();
    }
  }, [initialized, refreshSession]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const topbar = topbarRef.current;
    if (!topbar) return;

    const syncTopbarHeight = () => {
      document.documentElement.style.setProperty("--topbar-height", `${topbar.offsetHeight}px`);
    };

    syncTopbarHeight();

    const observer = new ResizeObserver(syncTopbarHeight);
    observer.observe(topbar);
    window.addEventListener("resize", syncTopbarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncTopbarHeight);
    };
  }, [initialized]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (!initialized) {
    return <PageLoader label={t("app.checkingSession")} className="page-loader--fullscreen" />;
  }

  const shellClassName = menuOpen ? "app-shell app-shell--menu-open" : "app-shell";

  return (
    <div className={shellClassName}>
      <header ref={topbarRef} className="topbar">
        <Link to="/" className="topbar-brand" onClick={() => setMenuOpen(false)}>
          <span className="eyebrow">{t("app.eyebrow")}</span>
        </Link>

        <nav id="topbar-nav" className="topbar-actions topbar-actions--desktop" aria-label={t("app.mainNav")}>
          <TopbarNavLinks
            location={location}
            isAuthenticated={isAuthenticated}
            user={user}
            onNavigate={() => setMenuOpen(false)}
            onLogout={() => void logout()}
            t={t}
          />
        </nav>

        <button
          type="button"
          className="topbar-burger topbar-icon-btn"
          aria-expanded={menuOpen}
          aria-controls="topbar-mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? t("app.closeMenu") : t("app.openMenu")}
        >
          <BurgerIcon open={menuOpen} />
        </button>
      </header>

      <div className="topbar-mobile-layer" hidden={!menuOpen}>
        <button
          type="button"
          className="topbar-mobile-backdrop"
          aria-label={t("app.closeMenu")}
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          id="topbar-mobile-nav"
          className="topbar-drawer"
          aria-label={t("app.mainNav")}
          aria-hidden={!menuOpen}
        >
          <TopbarNavLinks
            location={location}
            isAuthenticated={isAuthenticated}
            user={user}
            onNavigate={() => setMenuOpen(false)}
            onLogout={() => void logout()}
            t={t}
            mobile
          />
        </nav>
      </div>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

type TopbarNavLinksProps = {
  location: ReturnType<typeof useLocation>;
  isAuthenticated: boolean;
  user: RootState["auth"]["user"];
  onNavigate: () => void;
  onLogout: () => void;
  t: ReturnType<typeof useI18n>["t"];
  mobile?: boolean;
};

function TopbarNavLinks({ location, isAuthenticated, user, onNavigate, onLogout, t, mobile }: TopbarNavLinksProps) {
  const linkClass = (active: boolean) =>
    active ? "active-link topbar-nav-link" : "topbar-nav-link";

  return (
    <>
      <Link to="/" className={linkClass(location.pathname === "/")} onClick={onNavigate}>
        {t("app.home")}
      </Link>
      {isAuthenticated ? (
        <>
          <Link
            to="/projects"
            className={linkClass(
              location.pathname === "/projects" || /^\/projects\/[^/]+/.test(location.pathname),
            )}
            onClick={onNavigate}
          >
            {t("app.dashboard")}
          </Link>
          {user?.isAdmin ? (
            <Link
              to="/admin"
              className={linkClass(location.pathname.startsWith("/admin"))}
              onClick={onNavigate}
            >
              {t("app.admin")}
            </Link>
          ) : null}
          <span className={`user-chip topbar-nav-user${mobile ? "" : " topbar-nav-user--desktop"}`}>
            {user?.fullName ?? user?.email}
          </span>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className={linkClass(location.pathname === "/login")}
            onClick={onNavigate}
          >
            {t("app.login")}
          </Link>
          <Link
            to="/register"
            className={linkClass(location.pathname === "/register")}
            onClick={onNavigate}
          >
            {t("app.register")}
          </Link>
        </>
      )}
      <div className="topbar-nav-tools">
        <PreferencesMenu />
        {isAuthenticated ? (
          <button
            type="button"
            className="topbar-icon-btn topbar-icon-btn--logout"
            onClick={() => {
              onNavigate();
              onLogout();
            }}
            aria-label={t("app.signOut")}
            title={t("app.signOut")}
          >
            <LogoutIcon />
          </button>
        ) : null}
      </div>
    </>
  );
}
