import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useGetAdminUsersQuery, useUpdateAdminUserMutation } from "../../store/api/adminApi";
import type { AdminUserDto, AdminUserFilterOption, AdminUserSortOption } from "../../store/types/admin.types";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { sameUserId } from "../../shared/lib/uuid";
import { useI18n } from "../../shared/i18n";
import { AdminUsersToolbar } from "./components/AdminUsersToolbar/AdminUsersToolbar";
import "./AdminPage.css";

const PAGE_SIZE = 50;

export function AdminPage() {
  const { t } = useI18n();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<AdminUserSortOption>("name_asc");
  const [filterBy, setFilterBy] = useState<AdminUserFilterOption>("all");
  const [offset, setOffset] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);

  const queryArgs = useMemo(
    () => ({
      search,
      sort: sortBy,
      filter: filterBy,
      limit: PAGE_SIZE,
      offset,
    }),
    [search, sortBy, filterBy, offset],
  );

  const { data, isLoading, isFetching, error } = useGetAdminUsersQuery(queryArgs);
  const [updateAdminUser] = useUpdateAdminUserMutation();

  const resetPagination = useCallback(() => setOffset(0), []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      resetPagination();
    },
    [resetPagination],
  );

  const handleSortChange = useCallback(
    (value: AdminUserSortOption) => {
      setSortBy(value);
      resetPagination();
    },
    [resetPagination],
  );

  const handleFilterChange = useCallback(
    (value: AdminUserFilterOption) => {
      setFilterBy(value);
      resetPagination();
    },
    [resetPagination],
  );

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const listError = error ? getRtkQueryErrorMessage(error) : null;

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + users.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  async function runUserUpdate(
    target: AdminUserDto,
    patch: { isBlocked?: boolean; isAdmin?: boolean },
    confirmKey: string,
  ) {
    if (!window.confirm(t(confirmKey, { name: target.fullName }))) {
      return;
    }

    setActionError(null);
    setBusyFor(target.id);
    try {
      await updateAdminUser({ userId: target.id, ...patch }).unwrap();
    } catch (err) {
      setActionError(getRtkQueryErrorMessage(err));
    } finally {
      setBusyFor(null);
    }
  }

  function toggleBlocked(target: AdminUserDto) {
    const nextBlocked = !target.isBlocked;
    const confirmKey = nextBlocked ? "admin.confirmBlock" : "admin.confirmUnblock";
    void runUserUpdate(target, { isBlocked: nextBlocked }, confirmKey);
  }

  function toggleAdmin(target: AdminUserDto) {
    const nextAdmin = !target.isAdmin;
    const confirmKey = nextAdmin ? "admin.confirmGrantAdmin" : "admin.confirmRevokeAdmin";
    void runUserUpdate(target, { isAdmin: nextAdmin }, confirmKey);
  }

  return (
    <section className="page admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">{t("admin.eyebrow")}</p>
          <h2>{t("admin.title")}</h2>
          <p className="muted admin-page-desc">{t("admin.description")}</p>
        </div>
        <Link to="/" className="secondary-button">
          {t("admin.backToDashboard")}
        </Link>
      </header>

      <AdminUsersToolbar
        search={search}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        filterBy={filterBy}
        onFilterChange={handleFilterChange}
      />

      {actionError ? <p className="form-error">{actionError}</p> : null}
      {listError ? <p className="form-error">{listError}</p> : null}

      <p className="muted small-meta admin-page-meta">
        {isFetching && !isLoading ? t("admin.refreshing") : null}
        {t("admin.showingUsers", { from: pageStart, to: pageEnd, total })}
      </p>

      <div className="members-table-wrap admin-users-table-wrap">
        <table className="members-table admin-users-table">
          <thead>
            <tr>
              <th scope="col">{t("admin.colUser")}</th>
              <th scope="col">{t("admin.colRole")}</th>
              <th scope="col">{t("admin.colStatus")}</th>
              <th scope="col" className="members-actions-col">
                {t("admin.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="muted">
                  {t("admin.loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  {t("admin.empty")}
                </td>
              </tr>
            ) : (
              users.map((row) => {
                const isSelf = sameUserId(row.id, currentUser?.id);
                const busy = busyFor === row.id;
                return (
                  <tr key={row.id} className={row.isBlocked ? "admin-user-row--blocked" : undefined}>
                    <td>
                      <div className="member-name-cell">
                        <span className="member-name">{row.fullName}</span>
                        <span className="member-email muted">{row.email}</span>
                        {isSelf ? <span className="member-you muted">{t("admin.you")}</span> : null}
                      </div>
                    </td>
                    <td>
                      {row.isAdmin ? (
                        <span className="admin-badge">{t("admin.roleAdmin")}</span>
                      ) : (
                        <span className="muted">{t("admin.roleUser")}</span>
                      )}
                    </td>
                    <td>
                      {row.isBlocked ? (
                        <span className="status-badge status-badge--blocked">{t("admin.statusBlocked")}</span>
                      ) : (
                        <span className="status-badge status-badge--active">{t("admin.statusActive")}</span>
                      )}
                    </td>
                    <td className="members-actions-cell">
                      {isSelf ? (
                        <span className="muted small-meta">{t("admin.cannotChangeSelf")}</span>
                      ) : (
                        <div className="admin-user-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => toggleAdmin(row)}
                          >
                            {busy
                              ? t("admin.saving")
                              : row.isAdmin
                                ? t("admin.revokeAdmin")
                                : t("admin.grantAdmin")}
                          </button>
                          <button
                            type="button"
                            className={row.isBlocked ? "secondary-button" : "danger-button"}
                            disabled={busy}
                            onClick={() => toggleBlocked(row)}
                          >
                            {row.isBlocked ? t("admin.unblock") : t("admin.block")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE ? (
        <div className="admin-pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={!canPrev || isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            {t("admin.prevPage")}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!canNext || isFetching}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            {t("admin.nextPage")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
