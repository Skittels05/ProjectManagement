import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { AppStore } from "../../store";
import { authApi } from "../../store/api/authApi";
import { http } from "./http";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

const AUTH_SKIP_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) {
    return true;
  }
  return AUTH_SKIP_PATHS.some((path) => url.includes(path));
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(store: AppStore): Promise<boolean> {
  try {
    await store.dispatch(authApi.endpoints.refresh.initiate()).unwrap();
    return true;
  } catch {
    return false;
  }
}

export function setupHttpAuthInterceptor(store: AppStore): void {
  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableRequestConfig | undefined;

      if (!config) {
        return Promise.reject(error);
      }

      const status = error.response?.status;

      if (status !== 401 || config._authRetry || shouldSkipRefresh(config.url)) {
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = refreshSession(store).finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (!refreshed) {
        return Promise.reject(error);
      }

      config._authRetry = true;
      return http(config);
    },
  );
}
