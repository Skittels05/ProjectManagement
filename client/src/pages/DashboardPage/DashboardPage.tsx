import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchProjects } from "../../store/thunks/projectsThunks";
import type { ProjectDto } from "../../store/types/projects.types";
import { isOwnerRoleName } from "../../shared/lib/projectRole";
import { CreateProjectModal } from "./components/CreateProjectModal/CreateProjectModal";
import {
  DashboardProjectsToolbar,
  type ProjectFilterOption,
  type ProjectSortOption,
} from "./components/DashboardProjectsToolbar/DashboardProjectsToolbar";
import { DashboardHeroCard } from "./components/DashboardHeroCard/DashboardHeroCard";
import { ProjectListPanel } from "./components/ProjectListPanel/ProjectListPanel";
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
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list } = useSelector((state: RootState) => state.projects);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ProjectSortOption>("updated_desc");
  const [filterBy, setFilterBy] = useState<ProjectFilterOption>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchProjects());
  }, [dispatch]);

  const visibleProjects = useMemo(() => {
    let next = applyFilter(list, filterBy);
    next = applySearch(next, search);
    next = applySort(next, sortBy);
    return next;
  }, [list, filterBy, search, sortBy]);

  const emptyMessage =
    list.length === 0
      ? "You are not in any project yet. Click “New project” to create one."
      : "No projects match your search or filters.";

  return (
    <section className="page dashboard-page">
      <DashboardHeroCard displayName={user?.fullName ?? user?.email ?? ""} />

      <div className="project-panel dashboard-controls-panel">
        <DashboardProjectsToolbar
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          onNewProject={() => setCreateModalOpen(true)}
        />
      </div>

      <ProjectListPanel projects={visibleProjects} emptyMessage={emptyMessage} />

      <CreateProjectModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </section>
  );
}
