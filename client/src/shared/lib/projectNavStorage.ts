const key = (projectId: string) => `pm-project-nav:${projectId}`;

export function saveProjectNavPath(projectId: string, searchParams: URLSearchParams): void {
  const qs = searchParams.toString();
  const path = qs ? `/projects/${projectId}?${qs}` : `/projects/${projectId}`;
  sessionStorage.setItem(key(projectId), path);
}

export function loadProjectNavPath(projectId: string): string {
  return sessionStorage.getItem(key(projectId)) ?? `/projects/${projectId}`;
}
