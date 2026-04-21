import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { bootstrapAuth, logoutUser } from "../../store/thunks/authThunks";
import "./AppShell.css";

export function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { initialized, isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!initialized) {
      void dispatch(bootstrapAuth());
    }
  }, [dispatch, initialized]);

  if (!initialized) {
    return <div className="page page-center">Checking session...</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Scrum Tracker</p>
          <h1>Project Management</h1>
        </div>
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
                Dashboard
              </Link>
              <span className="user-chip">{user?.fullName ?? user?.email}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void dispatch(logoutUser())}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={location.pathname === "/login" ? "active-link" : ""}>
                Login
              </Link>
              <Link
                to="/register"
                className={location.pathname === "/register" ? "active-link" : ""}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
