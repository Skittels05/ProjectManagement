import { useI18n } from "../../../../shared/i18n";
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
  const { t } = useI18n();

  return (
    <div className="projects-toolbar">
      <div className="toolbar-field toolbar-field-grow">
        <label htmlFor="dashboard-project-search">{t("dashboard.search")}</label>
        <input
          id="dashboard-project-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          autoComplete="off"
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="dashboard-project-sort">{t("dashboard.sort")}</label>
        <select
          id="dashboard-project-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as ProjectSortOption)}
        >
          <option value="updated_desc">{t("dashboard.sortUpdatedDesc")}</option>
          <option value="updated_asc">{t("dashboard.sortUpdatedAsc")}</option>
          <option value="name_asc">{t("dashboard.sortNameAsc")}</option>
          <option value="name_desc">{t("dashboard.sortNameDesc")}</option>
        </select>
      </div>
      <div className="toolbar-field">
        <label htmlFor="dashboard-project-filter">{t("dashboard.filter")}</label>
        <select
          id="dashboard-project-filter"
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value as ProjectFilterOption)}
        >
          <option value="all">{t("dashboard.filterAll")}</option>
          <option value="owner">{t("dashboard.filterOwner")}</option>
        </select>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="primary-button" onClick={onNewProject}>
          {t("dashboard.newProject")}
        </button>
      </div>
    </div>
  );
}
