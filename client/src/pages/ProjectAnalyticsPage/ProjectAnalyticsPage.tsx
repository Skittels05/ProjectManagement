import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  useGetActivityLogQuery,
  useGetSprintBurndownQuery,
  useGetSprintScatterQuery,
  useGetSprintStatsQuery,
  useGetTeamVelocityQuery,
  useGetTimeLogReportQuery,
  type TimeLogReportFilters,
} from "../../store/api/analyticsApi";
import { useGetProjectQuery } from "../../store/api/projectsApi";
import { useGetSprintsQuery } from "../../store/api/sprintsApi";
import type { ActivityItemDto } from "../../store/types/analytics.types";
import type { ProjectMemberDto } from "../../store/types/projects.types";
import { formatDurationMinutes } from "../../shared/lib/duration";
import {
  activityReportHtml,
  downloadWordReport,
  openPrintableReport,
  scatterReportHtml,
  scatterReportHtmlForWord,
  sprintReportHtml,
  sprintReportHtmlForWord,
  timeReportHtml,
} from "../../shared/lib/exportReport";
import {
  downloadActivityExcel,
  downloadScatterExcel,
  downloadSprintExcel,
  downloadTimeLogExcel,
} from "../../shared/lib/exportExcel";
import { formatLocaleDateTime } from "../../shared/lib/formatDate";
import { loadProjectNavPath } from "../../shared/lib/projectNavStorage";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { isUuidV4 } from "../../shared/lib/uuid";
import { useI18n } from "../../shared/i18n";
import { useAppSelector } from "../../store/hooks";
import { BurndownChart, ScatterChart } from "./components/AnalyticsCharts";
import "./ProjectAnalyticsPage.css";

type AnalyticsTab = "sprint" | "planning" | "time" | "activity";

const TABS: { id: AnalyticsTab; labelKey: "analytics.tabSprint" | "analytics.tabPlanning" | "analytics.tabTime" | "analytics.tabActivity" }[] = [
  { id: "sprint", labelKey: "analytics.tabSprint" },
  { id: "planning", labelKey: "analytics.tabPlanning" },
  { id: "time", labelKey: "analytics.tabTime" },
  { id: "activity", labelKey: "analytics.tabActivity" },
];

function activityMessage(
  t: ReturnType<typeof useI18n>["t"],
  item: ActivityItemDto,
): string {
  const meta = item.metadata;
  const title = String(meta.title ?? "");
  switch (item.action) {
    case "task.created":
      return t("analytics.activityTaskCreated", { title });
    case "task.updated":
      return t("analytics.activityTaskUpdated", { title });
    case "task.deleted":
      return t("analytics.activityTaskDeleted", { title });
    case "task.status_changed":
      return t("analytics.activityStatusChanged", {
        title,
        from: String(meta.from ?? ""),
        to: String(meta.to ?? ""),
      });
    case "task.sprint_changed":
      return t("analytics.activitySprintChanged", { title });
    case "task.story_points_changed":
      return t("analytics.activitySpChanged", { title });
    case "sprint.created":
      return t("analytics.activitySprintCreated", { name: String(meta.name ?? "") });
    case "sprint.updated":
      return t("analytics.activitySprintUpdated", { name: String(meta.name ?? "") });
    case "sprint.deleted":
      return t("analytics.activitySprintDeleted", { name: String(meta.name ?? "") });
    case "comment.created":
      return t("analytics.activityCommentCreated", { title });
    case "comment.updated":
      return t("analytics.activityCommentUpdated", { title });
    case "comment.deleted":
      return t("analytics.activityCommentDeleted", { title });
    case "attachment.uploaded":
      return t("analytics.activityAttachmentUploaded", {
        title,
        filename: String(meta.filename ?? ""),
      });
    case "attachment.deleted":
      return t("analytics.activityAttachmentDeleted", {
        title,
        filename: String(meta.filename ?? ""),
      });
    case "time_log.created":
      return t("analytics.activityTimeLogCreated", {
        title,
        minutes: String(meta.minutes ?? ""),
      });
    case "time_log.updated":
      return t("analytics.activityTimeLogUpdated", { title });
    case "time_log.deleted":
      return t("analytics.activityTimeLogDeleted", { title });
    case "member.invited":
      return t("analytics.activityMemberInvited", {
        name: String(meta.name ?? ""),
        role: String(meta.role ?? ""),
      });
    case "member.role_changed":
      return t("analytics.activityMemberRoleChanged", {
        name: String(meta.name ?? ""),
        from: String(meta.from ?? ""),
        to: String(meta.to ?? ""),
      });
    case "member.removed":
      return t("analytics.activityMemberRemoved", { name: String(meta.name ?? "") });
    case "member.left":
      return t("analytics.activityMemberLeft", { name: String(meta.name ?? "") });
    default:
      return item.action;
  }
}

function safeFilePart(value: string): string {
  return value.replace(/[^\p{L}\p{N}\-_]+/gu, "-").replace(/^-+|-+$/g, "") || "report";
}

function AnalyticsExportButtons({
  disabled,
  onExcel,
  onPdf,
  onDocx,
  t,
}: {
  disabled?: boolean;
  onExcel: () => void;
  onPdf: () => void;
  onDocx: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <div className="analytics-export-actions">
      <button type="button" className="secondary-button" disabled={disabled} onClick={() => void onExcel()}>
        {t("analytics.exportExcel")}
      </button>
      <button type="button" className="secondary-button" disabled={disabled} onClick={onPdf}>
        {t("analytics.exportPdf")}
      </button>
      <button type="button" className="secondary-button" disabled={disabled} onClick={onDocx}>
        {t("analytics.exportDocx")}
      </button>
    </div>
  );
}

export function ProjectAnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();
  const locale = useAppSelector((s) => s.settings.locale);

  const validProjectId = projectId && isUuidV4(projectId) ? projectId : null;
  const tabParam = searchParams.get("tab");
  const tab: AnalyticsTab =
    tabParam === "planning" || tabParam === "time" || tabParam === "activity" ? tabParam : "sprint";
  const sprintIdFromUrl = searchParams.get("sprint") ?? "";

  const { data: project, isLoading: projectLoading } = useGetProjectQuery(validProjectId ?? "", {
    skip: !validProjectId,
  });
  const { data: sprints = [] } = useGetSprintsQuery(validProjectId ?? "", { skip: !validProjectId });

  const defaultSprintId = useMemo(() => {
    const active = sprints.find((s) => s.status === "active");
    if (active) return active.id;
    const completed = sprints.find((s) => s.status === "completed");
    return completed?.id ?? sprints[0]?.id ?? "";
  }, [sprints]);

  const selectedSprintId =
    sprintIdFromUrl && sprints.some((s) => s.id === sprintIdFromUrl) ? sprintIdFromUrl : defaultSprintId;

  const setTab = useCallback(
    (next: AnalyticsTab) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", next);
      if (selectedSprintId) nextParams.set("sprint", selectedSprintId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, selectedSprintId, setSearchParams],
  );

  const setSprintId = useCallback(
    (id: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);
      if (id) nextParams.set("sprint", id);
      else nextParams.delete("sprint");
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams, tab],
  );

  useEffect(() => {
    if (!defaultSprintId || sprintIdFromUrl) return;
    setSprintId(defaultSprintId);
  }, [defaultSprintId, sprintIdFromUrl, setSprintId]);

  const skipSprint = !validProjectId || !selectedSprintId;
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
  } = useGetSprintStatsQuery(
    { projectId: validProjectId!, sprintId: selectedSprintId },
    { skip: skipSprint },
  );
  const {
    data: burndown,
    isLoading: burndownLoading,
    isError: burndownError,
    error: burndownErrorObj,
  } = useGetSprintBurndownQuery(
    { projectId: validProjectId!, sprintId: selectedSprintId },
    { skip: skipSprint || tab !== "sprint" },
  );
  const {
    data: scatter,
    isLoading: scatterLoading,
    isError: scatterError,
    error: scatterErrorObj,
  } = useGetSprintScatterQuery(
    { projectId: validProjectId!, sprintId: selectedSprintId },
    { skip: skipSprint || tab !== "planning" },
  );
  const { data: velocity } = useGetTeamVelocityQuery(validProjectId ?? "", { skip: !validProjectId });

  const [timeFilters, setTimeFilters] = useState<TimeLogReportFilters>({});
  const { data: timeReport, isLoading: timeLoading } = useGetTimeLogReportQuery(
    { projectId: validProjectId!, filters: timeFilters },
    { skip: !validProjectId || tab !== "time" },
  );
  const { data: activity, isLoading: activityLoading } = useGetActivityLogQuery(
    { projectId: validProjectId!, limit: 50 },
    { skip: !validProjectId || tab !== "activity" },
  );

  const members: ProjectMemberDto[] = project?.members ?? [];

  const projectLabel = project?.name ?? "project";
  const formatDur = (minutes: number) => formatDurationMinutes(minutes);
  const activityLine = (item: ActivityItemDto) => activityMessage(t, item);
  const activityWhen = (iso: string) => formatLocaleDateTime(iso, locale);

  const sprintReportSubtitle = stats
    ? `${projectLabel} · ${stats.sprint.name} · ${stats.sprint.startsAt} — ${stats.sprint.endsAt}`
    : projectLabel;

  const burndownChartLabels = {
    axisX: t("analytics.burndownAxisX"),
    axisY: t("analytics.burndownAxisY"),
    ideal: t("analytics.idealLine"),
    actual: t("analytics.actualLine"),
  };

  const scatterChartLabels = {
    axisX: t("analytics.scatterX"),
    axisY: t("analytics.scatterY"),
  };

  const sprintReportBody = () => {
    if (!stats || !burndown) return "";
    return sprintReportHtml(stats, burndown, velocity, formatDur, burndownChartLabels, {
      summary: t("analytics.exportSectionSummary"),
      burndown: t("analytics.burndownTitle"),
      burndownData: t("analytics.exportDataTable"),
      velocity: t("analytics.velocityTitle"),
    });
  };

  const scatterReportBody = () => {
    if (!scatter?.points.length) return "";
    return scatterReportHtml(
      scatter.points,
      scatterChartLabels,
      t("analytics.scatterTitle"),
      t("analytics.exportDataTable"),
    );
  };

  const printReport = (title: string, subtitle: string, bodyHtml: string) => {
    const ok = openPrintableReport(title, subtitle, bodyHtml, t("analytics.exportPdfHint"));
    if (!ok) {
      window.alert(t("analytics.exportPdfFailed"));
    }
  };

  const exportSprintExcel = async () => {
    if (!stats || !burndown) return;
    const base = safeFilePart(`${projectLabel}-${stats.sprint.name}-sprint`);
    await downloadSprintExcel(
      `${base}.xlsx`,
      stats,
      burndown,
      velocity,
      formatDur,
      burndownChartLabels,
      {
        summary: t("analytics.exportSectionSummary"),
        burndown: t("analytics.burndownTitle"),
        velocity: t("analytics.velocityTitle"),
      },
    );
  };

  const exportSprintPdf = () => {
    if (!stats || !burndown) return;
    printReport(t("analytics.tabSprint"), sprintReportSubtitle, sprintReportBody());
  };

  const exportSprintDocx = async () => {
    if (!stats || !burndown) return;
    const base = safeFilePart(`${projectLabel}-${stats.sprint.name}-sprint`);
    const body = await sprintReportHtmlForWord(stats, burndown, velocity, formatDur, burndownChartLabels, {
      summary: t("analytics.exportSectionSummary"),
      burndown: t("analytics.burndownTitle"),
      burndownData: t("analytics.exportDataTable"),
      velocity: t("analytics.velocityTitle"),
    });
    downloadWordReport(`${base}.doc`, t("analytics.tabSprint"), sprintReportSubtitle, body);
  };

  const exportScatterExcel = async () => {
    if (!scatter?.points.length) return;
    const sprintName = sprints.find((s) => s.id === selectedSprintId)?.name ?? "sprint";
    const base = safeFilePart(`${projectLabel}-${sprintName}-planning`);
    await downloadScatterExcel(`${base}.xlsx`, scatter.points, scatterChartLabels, t("analytics.scatterTitle"));
  };

  const exportScatterPdf = () => {
    if (!scatter?.points.length) return;
    const sprintName = sprints.find((s) => s.id === selectedSprintId)?.name ?? "";
    printReport(
      t("analytics.scatterTitle"),
      `${projectLabel}${sprintName ? ` · ${sprintName}` : ""}`,
      scatterReportBody(),
    );
  };

  const exportScatterDocx = async () => {
    if (!scatter?.points.length) return;
    const sprintName = sprints.find((s) => s.id === selectedSprintId)?.name ?? "sprint";
    const base = safeFilePart(`${projectLabel}-${sprintName}-planning`);
    const body = await scatterReportHtmlForWord(
      scatter.points,
      scatterChartLabels,
      t("analytics.scatterTitle"),
      t("analytics.exportDataTable"),
    );
    downloadWordReport(
      `${base}.doc`,
      t("analytics.scatterTitle"),
      `${projectLabel} · ${sprintName}`,
      body,
    );
  };

  const exportTimeExcel = async () => {
    if (!timeReport) return;
    await downloadTimeLogExcel("time-log-report.xlsx", timeReport, formatDur, {
      logs: t("analytics.tabTime"),
      summary: t("analytics.exportSectionSummary"),
    });
  };

  const exportTimePdf = () => {
    if (!timeReport) return;
    printReport(t("analytics.tabTime"), projectLabel, timeReportHtml(timeReport, formatDur));
  };

  const exportTimeDocx = () => {
    if (!timeReport) return;
    downloadWordReport(
      "time-log-report.doc",
      t("analytics.tabTime"),
      projectLabel,
      timeReportHtml(timeReport, formatDur),
    );
  };

  const exportActivityExcel = async () => {
    if (!activity?.items.length) return;
    await downloadActivityExcel(
      "activity-log.xlsx",
      activity.items.map((item) => ({
        createdAt: activityWhen(item.createdAt),
        userName: item.user?.fullName ?? t("analytics.systemUser"),
        details: activityLine(item),
      })),
      t("analytics.tabActivity"),
    );
  };

  const exportActivityPdf = () => {
    if (!activity?.items.length) return;
    printReport(
      t("analytics.tabActivity"),
      projectLabel,
      activityReportHtml(activity.items, activityLine, activityWhen),
    );
  };

  const exportActivityDocx = () => {
    if (!activity?.items.length) return;
    downloadWordReport(
      "activity-log.doc",
      t("analytics.tabActivity"),
      projectLabel,
      activityReportHtml(activity.items, activityLine, activityWhen),
    );
  };

  const sprintExportReady = Boolean(stats && burndown && !burndownLoading);
  const scatterExportReady = Boolean(scatter?.points.length);
  const timeExportReady = Boolean(timeReport && !timeLoading);
  const activityExportReady = Boolean(activity?.items.length);

  if (!validProjectId) {
    return (
      <section className="page analytics-page">
        <p className="form-error">{t("project.invalidLink")}</p>
        <Link to="/">{t("project.backToDashboard")}</Link>
      </section>
    );
  }

  if (projectLoading) {
    return (
      <section className="page analytics-page">
        <p className="muted">{t("project.loading")}</p>
      </section>
    );
  }

  return (
    <section className="page analytics-page">
      <header className="analytics-page-header">
        <div>
          <p className="eyebrow">{t("analytics.eyebrow")}</p>
          <h1>{t("analytics.title")}</h1>
          <p className="muted">{project?.name}</p>
        </div>
        <Link to={loadProjectNavPath(validProjectId)} className="back-link">
          {t("analytics.backToProject")}
        </Link>
      </header>

      <nav className="analytics-tabs" aria-label={t("analytics.tabsLabel")}>
        {TABS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            className={`analytics-tab${tab === id ? " analytics-tab-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>

      {(tab === "sprint" || tab === "planning") && (
        <div className="analytics-controls">
          <div className="toolbar-field">
            <label htmlFor="analytics-sprint">{t("analytics.selectSprint")}</label>
            <select
              id="analytics-sprint"
              value={selectedSprintId}
              onChange={(e) => setSprintId(e.target.value)}
            >
              {sprints.length === 0 ? (
                <option value="">{t("analytics.noSprints")}</option>
              ) : (
                sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {tab === "sprint" && (
        <div className="analytics-panel">
          {!selectedSprintId ? (
            <p className="muted">{t("analytics.pickSprint")}</p>
          ) : statsLoading ? (
            <p className="muted">{t("analytics.loading")}</p>
          ) : statsError ? (
            <p className="form-error">{getRtkQueryErrorMessage(statsErrorObj)}</p>
          ) : stats ? (
            <>
              <div className="analytics-export-bar">
                <span className="muted small-meta">{t("analytics.exportReport")}</span>
                <AnalyticsExportButtons
                  disabled={!sprintExportReady}
                  onExcel={exportSprintExcel}
                  onPdf={exportSprintPdf}
                  onDocx={exportSprintDocx}
                  t={t}
                />
              </div>
              <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statTasks")}</span>
                  <strong>{stats.totalTasks}</strong>
                </div>
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statCommittedSp")}</span>
                  <strong>{stats.committedStoryPoints}</strong>
                </div>
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statDoneSp")}</span>
                  <strong>{stats.completedStoryPoints}</strong>
                </div>
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statCompletion")}</span>
                  <strong>{stats.completionPercent}%</strong>
                </div>
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statTimeLogged")}</span>
                  <strong>{formatDurationMinutes(stats.totalLoggedMinutes)}</strong>
                </div>
                <div className="analytics-stat-card">
                  <span className="muted">{t("analytics.statByStatus")}</span>
                  <strong>
                    {stats.byStatus.todo} / {stats.byStatus.in_progress} / {stats.byStatus.done}
                  </strong>
                </div>
              </div>

              <section>
                <h2>{t("analytics.burndownTitle")}</h2>
                <p className="muted small-meta">{t("analytics.burndownHint")}</p>
                {burndownLoading ? (
                  <p className="muted">{t("analytics.loading")}</p>
                ) : burndownError ? (
                  <p className="form-error">{getRtkQueryErrorMessage(burndownErrorObj)}</p>
                ) : burndown ? (
                  <BurndownChart points={burndown.points} committedStoryPoints={burndown.committedStoryPoints} />
                ) : null}
              </section>

              {velocity && velocity.sprints.length > 0 ? (
                <section>
                  <h2>{t("analytics.velocityTitle")}</h2>
                  <p className="muted small-meta">
                    {velocity.averageCompletedStoryPoints != null
                      ? t("analytics.velocityAvg", { sp: velocity.averageCompletedStoryPoints })
                      : t("analytics.velocityNoAvg")}
                  </p>
                  <ul className="analytics-velocity-list">
                    {velocity.sprints.map((s) => (
                      <li key={s.sprintId}>
                        <span>{s.name}</span>
                        <span>
                          {s.completedStoryPoints} SP · {s.endsAt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <p className="muted">{t("analytics.loadFailed")}</p>
          )}
        </div>
      )}

      {tab === "planning" && (
        <div className="analytics-panel">
          <section>
            <h2>{t("analytics.scatterTitle")}</h2>
            <p className="muted small-meta">{t("analytics.scatterHint")}</p>
            {!selectedSprintId ? (
              <p className="muted">{t("analytics.pickSprint")}</p>
            ) : scatterLoading ? (
              <p className="muted">{t("analytics.loading")}</p>
            ) : scatterError ? (
              <p className="form-error">{getRtkQueryErrorMessage(scatterErrorObj)}</p>
            ) : scatter ? (
              <>
                {scatter.points.length > 0 ? (
                  <div className="analytics-export-bar">
                    <span className="muted small-meta">{t("analytics.exportReport")}</span>
                    <AnalyticsExportButtons
                      disabled={!scatterExportReady}
                      onExcel={exportScatterExcel}
                      onPdf={exportScatterPdf}
                      onDocx={exportScatterDocx}
                      t={t}
                    />
                  </div>
                ) : null}
                <ScatterChart points={scatter.points} />
              </>
            ) : null}
          </section>
        </div>
      )}

      {tab === "time" && (
        <div className="analytics-panel">
          <div className="analytics-controls">
            <div className="toolbar-field">
              <label htmlFor="time-from">{t("analytics.dateFrom")}</label>
              <input
                id="time-from"
                type="date"
                value={timeFilters.from ?? ""}
                onChange={(e) => setTimeFilters((f) => ({ ...f, from: e.target.value || undefined }))}
              />
            </div>
            <div className="toolbar-field">
              <label htmlFor="time-to">{t("analytics.dateTo")}</label>
              <input
                id="time-to"
                type="date"
                value={timeFilters.to ?? ""}
                onChange={(e) => setTimeFilters((f) => ({ ...f, to: e.target.value || undefined }))}
              />
            </div>
            <div className="toolbar-field">
              <label htmlFor="time-member">{t("analytics.member")}</label>
              <select
                id="time-member"
                value={timeFilters.userId ?? ""}
                onChange={(e) =>
                  setTimeFilters((f) => ({ ...f, userId: e.target.value || undefined }))
                }
              >
                <option value="">{t("analytics.allMembers")}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-field">
              <label htmlFor="time-sprint">{t("analytics.selectSprint")}</label>
              <select
                id="time-sprint"
                value={timeFilters.sprintId ?? ""}
                onChange={(e) =>
                  setTimeFilters((f) => ({ ...f, sprintId: e.target.value || undefined }))
                }
              >
                <option value="">{t("analytics.allSprints")}</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <AnalyticsExportButtons
              disabled={!timeExportReady}
              onExcel={exportTimeExcel}
              onPdf={exportTimePdf}
              onDocx={exportTimeDocx}
              t={t}
            />
          </div>

          {timeLoading ? (
            <p className="muted">{t("analytics.loading")}</p>
          ) : timeReport ? (
            <>
              <p className="muted">
                {t("analytics.timeTotal", { time: formatDurationMinutes(timeReport.totalMinutes) })}
              </p>
              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("analytics.colDate")}</th>
                      <th>{t("analytics.colUser")}</th>
                      <th>{t("analytics.colTask")}</th>
                      <th>{t("analytics.colSprint")}</th>
                      <th>{t("analytics.colMinutes")}</th>
                      <th>{t("analytics.colNote")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeReport.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="muted">
                          {t("analytics.noTimeLogs")}
                        </td>
                      </tr>
                    ) : (
                      timeReport.items.map((row) => (
                        <tr key={row.id}>
                          <td>{row.loggedAt}</td>
                          <td>{row.userName}</td>
                          <td>{row.taskTitle}</td>
                          <td>{row.sprintName ?? "—"}</td>
                          <td>{formatDurationMinutes(row.minutes)}</td>
                          <td>{row.note ?? ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "activity" && (
        <div className="analytics-panel">
          {activityLoading ? (
            <p className="muted">{t("analytics.loading")}</p>
          ) : activity?.items.length === 0 ? (
            <p className="muted">{t("analytics.noActivity")}</p>
          ) : (
            <>
              <div className="analytics-export-bar">
                <span className="muted small-meta">{t("analytics.exportReport")}</span>
                <AnalyticsExportButtons
                  disabled={!activityExportReady}
                  onExcel={exportActivityExcel}
                  onPdf={exportActivityPdf}
                  onDocx={exportActivityDocx}
                  t={t}
                />
              </div>
              <ul className="analytics-activity-list">
              {activity?.items.map((item) => (
                <li key={item.id} className="analytics-activity-item">
                  <strong>{item.user?.fullName ?? t("analytics.systemUser")}</strong>
                  <span> — {activityMessage(t, item)}</span>
                  <time dateTime={item.createdAt}>
                    {formatLocaleDateTime(item.createdAt, locale)}
                  </time>
                </li>
              ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

