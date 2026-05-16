import type {
  ActivityItemDto,
  BurndownDto,
  ScatterPointDto,
  SprintStatsDto,
  TimeLogReportDto,
  VelocityDto,
} from "../../store/types/analytics.types";
import {
  burndownChartSvg,
  scatterChartSvg,
  svgMarkupToPngBase64,
  type BurndownChartLabels,
  type ScatterChartLabels,
} from "./chartSvg";

export function downloadBlob(filename: string, content: string | Blob, mimeType?: string): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType ?? "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PRINT_STYLES = `
  body { font-family: Inter, Segoe UI, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 1.35rem; margin: 0 0 0.25rem; }
  .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .print-hint { color: #64748b; font-size: 0.85rem; margin-bottom: 1rem; }
  h2 { font-size: 1rem; margin: 1.25rem 0 0.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1rem; }
  th, td { border: 1px solid #cbd5e1; padding: 0.4rem 0.55rem; text-align: left; }
  th { background: #f1f5f9; }
  ul { margin: 0; padding-left: 1.2rem; }
  .report-chart { margin: 0.75rem 0 1.25rem; page-break-inside: avoid; }
  .report-chart svg, .report-chart img { max-width: 100%; height: auto; display: block; }
  .report-chart-legend { margin: 0.5rem 0 0; font-size: 0.85rem; color: #64748b; }
  @media print {
    body { padding: 12px; }
    .print-hint { display: none; }
  }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportDocumentHtml(title: string, subtitle: string, bodyHtml: string, printHint?: string): string {
  const hint = printHint
    ? `<p class="print-hint">${escapeHtml(printHint)}</p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(subtitle)}</p>${hint}${bodyHtml}</body></html>`;
}

function printHtmlInHiddenFrame(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "print");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = frameWin?.document;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
    }
  };

  frameWin.focus();
  frameWin.print();
  frameWin.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 120_000);
  return true;
}

function openHtmlInNewTab(html: string): boolean {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return true;
}

export function openPrintableReport(
  title: string,
  subtitle: string,
  bodyHtml: string,
  printHint?: string,
): boolean {
  const html = buildReportDocumentHtml(title, subtitle, bodyHtml, printHint);
  if (printHtmlInHiddenFrame(html)) {
    return true;
  }
  return openHtmlInNewTab(html);
}

export function downloadWordReport(filename: string, title: string, subtitle: string, bodyHtml: string): void {
  const html = buildReportDocumentHtml(title, subtitle, bodyHtml).replace(
    "<html>",
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">',
  );
  downloadBlob(filename, `\uFEFF${html}`, "application/msword");
}

async function chartImageBlock(svgFragment: string): Promise<string> {
  if (!svgFragment.trim()) return "";
  const legendMatch = svgFragment.match(/<p style="[\s\S]*?<\/p>\s*$/i);
  const legendHtml = legendMatch?.[0]?.replace("<p style=", '<p class="report-chart-legend" style=') ?? "";
  try {
    const base64 = await svgMarkupToPngBase64(svgFragment);
    return `<div class="report-chart"><img src="data:image/png;base64,${base64}" width="520" height="260" alt="Chart" />${legendHtml}</div>`;
  } catch {
    return "";
  }
}

function buildSprintReportContent(
  chartBlock: string,
  stats: SprintStatsDto,
  burndown: BurndownDto,
  velocity: VelocityDto | undefined,
  formatDuration: (minutes: number) => string,
  sectionTitles: { summary: string; burndown: string; burndownData: string; velocity: string },
): string {
  const burndownRows = burndown.points
    .map((p) => `<tr><td>${p.date}</td><td>${p.ideal}</td><td>${p.actual}</td></tr>`)
    .join("");
  const velocityBlock =
    velocity && velocity.sprints.length
      ? `<h2>${sectionTitles.velocity}</h2><table><thead><tr><th>Sprint</th><th>SP</th><th>End</th></tr></thead><tbody>${velocity.sprints.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.completedStoryPoints}</td><td>${s.endsAt}</td></tr>`).join("")}</tbody></table>`
      : "";
  return `
    <h2>${sectionTitles.summary}</h2>
    <table>
      <tr><th>Tasks</th><td>${stats.totalTasks}</td></tr>
      <tr><th>Committed SP</th><td>${stats.committedStoryPoints}</td></tr>
      <tr><th>Completed SP</th><td>${stats.completedStoryPoints}</td></tr>
      <tr><th>Completion</th><td>${stats.completionPercent}%</td></tr>
      <tr><th>Time logged</th><td>${formatDuration(stats.totalLoggedMinutes)}</td></tr>
      <tr><th>Status (todo / progress / done)</th><td>${stats.byStatus.todo} / ${stats.byStatus.in_progress} / ${stats.byStatus.done}</td></tr>
    </table>
    <h2>${sectionTitles.burndown}</h2>
    ${chartBlock}
    <h3 style="font-size:0.95rem;margin:1rem 0 0.5rem">${sectionTitles.burndownData}</h3>
    <table><thead><tr><th>Date</th><th>Ideal SP</th><th>Actual SP</th></tr></thead><tbody>${burndownRows}</tbody></table>
    ${velocityBlock}
  `;
}

function buildScatterReportContent(
  chartBlock: string,
  points: ScatterPointDto[],
  sectionTitle: string,
  tableTitle: string,
): string {
  return `
    <h2>${sectionTitle}</h2>
    ${chartBlock}
    <h3 style="font-size:0.95rem;margin:1rem 0 0.5rem">${tableTitle}</h3>
    <table><thead><tr><th>Task</th><th>SP</th><th>Minutes</th><th>Assignee</th></tr></thead><tbody>${points.map((p) => `<tr><td>${escapeHtml(p.title)}</td><td>${p.storyPoints}</td><td>${p.totalMinutes}</td><td>${escapeHtml(p.assignee?.fullName ?? "—")}</td></tr>`).join("")}</tbody></table>`;
}

export function sprintReportHtml(
  stats: SprintStatsDto,
  burndown: BurndownDto,
  velocity: VelocityDto | undefined,
  formatDuration: (minutes: number) => string,
  burndownLabels: BurndownChartLabels,
  sectionTitles: { summary: string; burndown: string; burndownData: string; velocity: string },
): string {
  const burndownChart = burndownChartSvg(burndown.points, burndown.committedStoryPoints, burndownLabels);
  const chartBlock = burndownChart ? `<div class="report-chart">${burndownChart}</div>` : "";
  return buildSprintReportContent(chartBlock, stats, burndown, velocity, formatDuration, sectionTitles);
}

export async function sprintReportHtmlForWord(
  stats: SprintStatsDto,
  burndown: BurndownDto,
  velocity: VelocityDto | undefined,
  formatDuration: (minutes: number) => string,
  burndownLabels: BurndownChartLabels,
  sectionTitles: { summary: string; burndown: string; burndownData: string; velocity: string },
): Promise<string> {
  const svg = burndownChartSvg(burndown.points, burndown.committedStoryPoints, burndownLabels);
  const chartBlock = await chartImageBlock(svg);
  return buildSprintReportContent(chartBlock, stats, burndown, velocity, formatDuration, sectionTitles);
}

export function scatterReportHtml(
  points: ScatterPointDto[],
  scatterLabels: ScatterChartLabels,
  sectionTitle: string,
  tableTitle: string,
): string {
  const chart = scatterChartSvg(points, scatterLabels);
  const chartBlock = chart ? `<div class="report-chart">${chart}</div>` : "";
  return buildScatterReportContent(chartBlock, points, sectionTitle, tableTitle);
}

export async function scatterReportHtmlForWord(
  points: ScatterPointDto[],
  scatterLabels: ScatterChartLabels,
  sectionTitle: string,
  tableTitle: string,
): Promise<string> {
  const svg = scatterChartSvg(points, scatterLabels);
  const chartBlock = await chartImageBlock(svg);
  return buildScatterReportContent(chartBlock, points, sectionTitle, tableTitle);
}

export function timeReportHtml(report: TimeLogReportDto, formatDuration: (m: number) => string): string {
  const rows = report.items
    .map(
      (r) =>
        `<tr><td>${r.loggedAt}</td><td>${r.userName}</td><td>${r.taskTitle}</td><td>${r.sprintName ?? "—"}</td><td>${formatDuration(r.minutes)}</td><td>${r.note ?? ""}</td></tr>`,
    )
    .join("");
  return `<p><strong>Total:</strong> ${formatDuration(report.totalMinutes)}</p><table><thead><tr><th>Date</th><th>User</th><th>Task</th><th>Sprint</th><th>Duration</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function activityReportHtml(
  items: ActivityItemDto[],
  formatLine: (item: ActivityItemDto) => string,
  formatWhen: (iso: string) => string,
): string {
  return `<table><thead><tr><th>When</th><th>User</th><th>Event</th></tr></thead><tbody>${items.map((i) => `<tr><td>${formatWhen(i.createdAt)}</td><td>${i.user?.fullName ?? "—"}</td><td>${formatLine(i)}</td></tr>`).join("")}</tbody></table>`;
}
