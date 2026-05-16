import type { AdminUserFilterOption, AdminUserSortOption } from "../../../../store/types/admin.types";
import { useI18n } from "../../../../shared/i18n";
import "./AdminUsersToolbar.css";

type AdminUsersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: AdminUserSortOption;
  onSortChange: (value: AdminUserSortOption) => void;
  filterBy: AdminUserFilterOption;
  onFilterChange: (value: AdminUserFilterOption) => void;
};

export function AdminUsersToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
}: AdminUsersToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="admin-users-toolbar projects-toolbar">
      <div className="toolbar-field toolbar-field-grow">
        <label htmlFor="admin-user-search">{t("admin.search")}</label>
        <input
          id="admin-user-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.searchPlaceholder")}
          autoComplete="off"
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="admin-user-sort">{t("admin.sort")}</label>
        <select
          id="admin-user-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as AdminUserSortOption)}
        >
          <option value="name_asc">{t("admin.sortNameAsc")}</option>
          <option value="name_desc">{t("admin.sortNameDesc")}</option>
          <option value="email_asc">{t("admin.sortEmailAsc")}</option>
          <option value="email_desc">{t("admin.sortEmailDesc")}</option>
        </select>
      </div>
      <div className="toolbar-field">
        <label htmlFor="admin-user-filter">{t("admin.filter")}</label>
        <select
          id="admin-user-filter"
          value={filterBy}
          onChange={(e) => onFilterChange(e.target.value as AdminUserFilterOption)}
        >
          <option value="all">{t("admin.filterAll")}</option>
          <option value="active">{t("admin.filterActive")}</option>
          <option value="blocked">{t("admin.filterBlocked")}</option>
          <option value="admins">{t("admin.filterAdmins")}</option>
        </select>
      </div>
    </div>
  );
}
