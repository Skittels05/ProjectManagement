import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute/ProtectedRoute";
import { PublicOnlyRoute } from "../components/PublicOnlyRoute/PublicOnlyRoute";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage";
import { LoginPage } from "../pages/LoginPage/LoginPage";
import { ProjectPage } from "../pages/ProjectPage/ProjectPage";
import { RegisterPage } from "../pages/RegisterPage/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "projects/:projectId", element: <ProjectPage /> },
        ],
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
