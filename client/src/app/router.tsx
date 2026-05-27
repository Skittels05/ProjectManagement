import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute/ProtectedRoute";
import { PublicOnlyRoute } from "../components/PublicOnlyRoute/PublicOnlyRoute";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage";
import { HomePage } from "../pages/HomePage/HomePage";
import { LoginPage } from "../pages/LoginPage/LoginPage";
import { ProjectPage } from "../pages/ProjectPage/ProjectPage";
import { ProjectAnalyticsPage } from "../pages/ProjectAnalyticsPage/ProjectAnalyticsPage";
import { AdminPage } from "../pages/AdminPage/AdminPage";
import { AdminRoute } from "../components/AdminRoute/AdminRoute";
import { RegisterPage } from "../pages/RegisterPage/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage/ProfilePage";
import { ProjectSettingsPage } from "../pages/ProjectSettingsPage/ProjectSettingsPage";
import { NotFoundPage } from "../pages/NotFoundPage/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "projects", element: <DashboardPage /> },
          { path: "projects/:projectId", element: <ProjectPage /> },
          { path: "projects/:projectId/analytics", element: <ProjectAnalyticsPage /> },
          { path: "projects/:projectId/settings", element: <ProjectSettingsPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [{ path: "admin", element: <AdminPage /> }],
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
