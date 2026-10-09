// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Uladzislau Petushkou

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "./store";
import { router } from "./app/router";
import { ConfirmProvider } from "./components/ConfirmDialog/confirmContext";
import { ToastProvider } from "./components/Toast/toastContext";
import { setupHttpAuthInterceptor } from "./shared/api/httpAuthInterceptor";
import "./pages/DashboardPage/components/CreateProjectModal/CreateProjectModal.css";
import "./app/global.css";
import "./components/Preloader/Preloader.css";

setupHttpAuthInterceptor(store);

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </Provider>
  </React.StrictMode>,
);
