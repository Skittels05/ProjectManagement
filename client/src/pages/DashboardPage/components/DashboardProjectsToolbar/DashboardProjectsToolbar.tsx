import "./DashboardProjectsToolbar.css";

export type ProjectSortOption = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

export type ProjectFilterOption = "all" | "owner";

type DashboardProjectsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: ProjectSortOption;
  onSortChange: (value: ProjectSortOption) => void;
  filterBy: ProjectFilterOption;
  onFilterChange: (value: ProjectFilterOption) => void;
  onNewProject: () => void;
};

export function DashboardProjectsToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  onNewProject,
}: DashboardProjectsToolbarProps) {
  return (
    <div className="projects-toolbar">
      <div className="toolbar-field toolbar-field-grow">
        <label htmlFor="dashboard-project-search">Search</label>
        <input
          id="dashboard-project-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name or description…"
          autoComplete="off"
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="dashboard-project-sort">Sort</label>
        <select
          id="dashboard-project-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as ProjectSortOption)}
        >
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Oldest update first</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>
      <div className="toolbar-field">
        <label htmlFor="dashboard-project-filter">Filter</label>
        <select
          id="dashboard-project-filter"
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value as ProjectFilterOption)}
        >
          <option value="all">All my projects</option>
          <option value="owner">Where I am owner</option>
        </select>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="primary-button" onClick={onNewProject}>
          New project
        </button>
      </div>
    </div>
  );
}
