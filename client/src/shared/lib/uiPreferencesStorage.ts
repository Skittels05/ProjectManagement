import { SETTINGS_STORAGE_KEY } from "../../store/slices/settingsSlice";

const DASHBOARD_NAV_KEY = "pm-dashboard-nav";
const PROJECT_NAV_PREFIX = "pm-project-nav:";

export function clearUiPreferencesStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  sessionStorage.removeItem(DASHBOARD_NAV_KEY);

  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PROJECT_NAV_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    sessionStorage.removeItem(key);
  }
}
