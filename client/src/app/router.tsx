import { useEffect } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { bootstrapAuth, logoutUser } from "../features/auth/model/authThunks";

function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { initialized, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

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
              <span className="user-chip">{user?.fullName ?? user?.email}</span>
              <button
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

function ProtectedRoute() {
  const { initialized, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!initialized) {
    return <div className="page page-center">Loading protected route...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const { initialized, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!initialized) {
    return <div className="page page-center">Loading auth page...</div>;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ index: true, element: <DashboardPage /> }],
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
    ],
  },
]);
