import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useGetProjectsQuery } from "../../store/api/projectsApi";
import type { ProjectDto } from "../../store/types/projects.types";
import { isOwnerRoleName } from "../../shared/lib/projectRole";
import { useI18n } from "../../shared/i18n";
import { CreateProjectModal } from "./components/CreateProjectModal/CreateProjectModal";
import {
  DashboardProjectsToolbar,
  type ProjectFilterOption,
  type ProjectSortOption,
} from "./components/DashboardProjectsToolbar/DashboardProjectsToolbar";
import { DashboardHeroCard } from "./components/DashboardHeroCard/DashboardHeroCard";
import { ProjectListPanel } from "./components/ProjectListPanel/ProjectListPanel";
import {
  buildDashboardSearchParams,
  parseDashboardState,
} from "../../shared/lib/dashboardSearchParams";
import { saveDashboardNavPath } from "../../shared/lib/dashboardNavStorage";
import "./DashboardPage.css";

function applyFilter(projects: ProjectDto[], filterBy: ProjectFilterOption): ProjectDto[] {
  if (filterBy === "owner") {
    return projects.filter((p) => isOwnerRoleName(String(p.role ?? "")));
  }
  return projects;
}

function applySearch(projects: ProjectDto[], q: string): ProjectDto[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return projects;
  return projects.filter((p) => {
    const name = p.name.toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    return name.includes(needle) || desc.includes(needle);
  });
}

function applySort(projects: ProjectDto[], sortBy: ProjectSortOption): ProjectDto[] {
  const copy = [...projects];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "updated_asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "name_asc":
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      case "name_desc":
        return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      case "updated_desc":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
  return copy;
}

export function DashboardPage() {
  const { t } = useI18n();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: list = [], isLoading: listLoading, error: listError } = useGetProjectsQuery();
  const [searchParams, setSearchParams] = useSearchParams();

  const { search, sortBy, filterBy } = useMemo(
    () => parseDashboardState(searchParams),
    [searchParams],
  );

  const syncDashboardUrl = useCallback(
    (patch: Partial<{ search: string; sortBy: ProjectSortOption; filterBy: ProjectFilterOption }>) => {
      const next = {
        search: patch.search ?? search,
        sortBy: patch.sortBy ?? sortBy,
        filterBy: patch.filterBy ?? filterBy,
      };
      setSearchParams(buildDashboardSearchParams(next), { replace: true });
    },
    [search, sortBy, filterBy, setSearchParams],
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    saveDashboardNavPath(searchParams);
  }, [searchParams]);

  const visibleProjects = useMemo(() => {
    let next = applyFilter(list, filterBy);
    next = applySearch(next, search);
    next = applySort(next, sortBy);
    return next;
  }, [list, filterBy, search, sortBy]);

  const emptyMessage =
    list.length === 0 ? t("dashboard.emptyNoProjects") : t("dashboard.emptyNoMatch");

  return (
    <section className="page dashboard-page">
      <DashboardHeroCard displayName={user?.fullName ?? user?.email ?? ""} />

      <div className="project-panel dashboard-controls-panel">
        <DashboardProjectsToolbar
          search={search}
          onSearchChange={(value) => syncDashboardUrl({ search: value })}
          sortBy={sortBy}
          onSortChange={(value) => syncDashboardUrl({ sortBy: value })}
          filterBy={filterBy}
          onFilterChange={(value) => syncDashboardUrl({ filterBy: value })}
          onNewProject={() => setCreateModalOpen(true)}
        />
      </div>

      <ProjectListPanel
        projects={visibleProjects}
        isLoading={listLoading}
        error={listError}
        emptyMessage={emptyMessage}
      />

      <CreateProjectModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </section>
  );
}
