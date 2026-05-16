import type {
  ProjectFilterOption,
  ProjectSortOption,
} from "../../pages/DashboardPage/components/DashboardProjectsToolbar/DashboardProjectsToolbar";

const SORT_OPTIONS: ProjectSortOption[] = [
  "updated_desc",
  "updated_asc",
  "name_asc",
  "name_desc",
];

export type DashboardPageState = {
  search: string;
  sortBy: ProjectSortOption;
  filterBy: ProjectFilterOption;
};

export const DEFAULT_DASHBOARD_STATE: DashboardPageState = {
  search: "",
  sortBy: "updated_desc",
  filterBy: "all",
};

function parseSort(raw: string | null): ProjectSortOption {
  if (raw && SORT_OPTIONS.includes(raw as ProjectSortOption)) {
    return raw as ProjectSortOption;
  }
  return DEFAULT_DASHBOARD_STATE.sortBy;
}

function parseFilter(raw: string | null): ProjectFilterOption {
  return raw === "owner" ? "owner" : "all";
}

export function parseDashboardState(params: URLSearchParams): DashboardPageState {
  return {
    search: params.get("q") ?? "",
    sortBy: parseSort(params.get("sort")),
    filterBy: parseFilter(params.get("filter")),
  };
}

export function buildDashboardSearchParams(state: DashboardPageState): URLSearchParams {
  const next = new URLSearchParams();
  const q = state.search.trim();
  if (q) next.set("q", q);
  if (state.sortBy !== DEFAULT_DASHBOARD_STATE.sortBy) {
    next.set("sort", state.sortBy);
  }
  if (state.filterBy !== "all") {
    next.set("filter", state.filterBy);
  }
  return next;
}
