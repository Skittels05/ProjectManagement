import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useGetProjectsQuery } from "../../store/api/projectsApi";
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

export function DashboardPage() {
  const { t } = useI18n();
  const { user } = useSelector((state: RootState) => state.auth);
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

  const projectsQuery = useMemo(
    () => ({ search, sort: sortBy, filter: filterBy }),
    [search, sortBy, filterBy],
  );

  const { data: list = [], isLoading: listLoading, error: listError } = useGetProjectsQuery(projectsQuery);

  useEffect(() => {
    saveDashboardNavPath(searchParams);
  }, [searchParams]);

  const hasListFilters = filterBy !== "all" || search.trim() !== "";
  const emptyMessage =
    hasListFilters && list.length === 0 ? t("dashboard.emptyNoMatch") : t("dashboard.emptyNoProjects");

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
        projects={list}
        isLoading={listLoading}
        error={listError}
        emptyMessage={emptyMessage}
      />

      <CreateProjectModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </section>
  );
}
