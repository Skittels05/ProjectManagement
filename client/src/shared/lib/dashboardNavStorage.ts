const STORAGE_KEY = "pm-dashboard-nav";

export function saveDashboardNavPath(searchParams: URLSearchParams): void {
  const qs = searchParams.toString();
  const path = qs ? `/projects?${qs}` : "/projects";
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function loadDashboardNavPath(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? "/projects";
}
