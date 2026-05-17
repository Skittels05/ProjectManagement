import PDFDocument from "pdfkit";
import * as analyticsService from "./analytics.service";
import * as activityService from "./activity.service";
import { Project } from "../../models";
import { AppError } from "../../utils/app-error";
import { drawBurndownChart, drawScatterChart } from "../../utils/pdf-charts";
import { PDF_FONT, PDF_FONT_BOLD, registerPdfFonts } from "../../utils/pdf-fonts";
import { isUuidV4 } from "../../utils/uuid";

export type AnalyticsPdfReport = "sprint" | "planning" | "time" | "activity";

export type AnalyticsPdfOptions = {
  report: AnalyticsPdfReport;
  sprintId?: string;
  from?: string;
  to?: string;
  userId?: string;
  activityLimit?: number;
};

function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function pdfBuffer(render: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    registerPdfFonts(doc);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    render(doc);
    doc.end();
  });
}

function writeTitle(doc: InstanceType<typeof PDFDocument>, title: string, subtitle: string): void {
  doc.fontSize(18).font(PDF_FONT_BOLD).text(title, { align: "left" });
  doc.moveDown(0.35);
  doc.fontSize(10).font(PDF_FONT).fillColor("#64748b").text(subtitle);
  doc.fillColor("#0f172a");
  doc.moveDown(1);
}

function writeHeading(doc: InstanceType<typeof PDFDocument>, text: string): void {
  doc.moveDown(0.5);
  doc.fontSize(12).font(PDF_FONT_BOLD).fillColor("#0f172a").text(text);
  doc.moveDown(0.35);
}

function writeKeyValues(doc: InstanceType<typeof PDFDocument>, rows: [string, string][]): void {
  doc.fontSize(10).font(PDF_FONT);
  for (const [label, value] of rows) {
    doc.font(PDF_FONT_BOLD).text(`${label}: `, { continued: true });
    doc.font(PDF_FONT).text(value);
  }
}

function writeTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  colWidths: number[],
): void {
  const startX = doc.page.margins.left;
  const rowHeight = 18;
  let y = doc.y;

  const drawRow = (cells: string[], bold: boolean) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    let x = startX;
    doc.font(bold ? PDF_FONT_BOLD : PDF_FONT).fontSize(9);
    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i]! - 4, ellipsis: true, lineBreak: false });
      x += colWidths[i]!;
    });
    y += rowHeight;
  };

  drawRow(headers, true);
  for (const row of rows) {
    drawRow(row, false);
  }
  doc.y = y + 8;
}

async function assertProjectName(projectId: string): Promise<string> {
  const project = await Project.findByPk(projectId, { attributes: ["name"] });
  if (!project) {
    throw new AppError("Project not found", 404);
  }
  return String(project.get("name") ?? "Project");
}

async function buildSprintPdf(
  userId: string,
  projectId: string,
  sprintId: string,
  projectLabel: string,
): Promise<Buffer> {
  const [stats, burndown, velocity] = await Promise.all([
    analyticsService.getSprintStats(userId, projectId, sprintId),
    analyticsService.getSprintBurndown(userId, projectId, sprintId),
    analyticsService.getTeamVelocity(userId, projectId),
  ]);

  const subtitle = `${projectLabel} · ${stats.sprint.name} · ${stats.sprint.startsAt} — ${stats.sprint.endsAt}`;

  return pdfBuffer((doc) => {
    writeTitle(doc, "Sprint report", subtitle);
    writeHeading(doc, "Summary");
    writeKeyValues(doc, [
      ["Tasks", String(stats.totalTasks)],
      ["Committed SP", String(stats.committedStoryPoints)],
      ["Completed SP", String(stats.completedStoryPoints)],
      ["Completion", `${stats.completionPercent}%`],
      ["Time logged", formatDurationMinutes(stats.totalLoggedMinutes)],
      [
        "Status (todo / in progress / done)",
        `${stats.byStatus.todo} / ${stats.byStatus.in_progress} / ${stats.byStatus.done}`,
      ],
    ]);

    writeHeading(doc, "Burndown");
    drawBurndownChart(doc, burndown.points, burndown.committedStoryPoints, {
      axisX: "Sprint day",
      axisY: "Story points",
      ideal: "Ideal",
      actual: "Actual",
    });

    writeHeading(doc, "Burndown data");
    writeTable(
      doc,
      ["Date", "Ideal SP", "Actual SP"],
      burndown.points.map((p) => [p.date, String(p.ideal), String(p.actual)]),
      [120, 100, 100],
    );

    if (velocity.sprints.length) {
      writeHeading(doc, "Team velocity");
      writeTable(
        doc,
        ["Sprint", "Completed SP", "End"],
        velocity.sprints.map((s) => [s.name, String(s.completedStoryPoints), s.endsAt] as string[]),
        [180, 100, 120],
      );
    }
  });
}

async function buildPlanningPdf(
  userId: string,
  projectId: string,
  sprintId: string,
  projectLabel: string,
): Promise<Buffer> {
  const scatter = await analyticsService.getSprintScatter(userId, projectId, sprintId);
  const subtitle = projectLabel;

  return pdfBuffer((doc) => {
    writeTitle(doc, "Planning accuracy", subtitle);
    writeHeading(doc, "Story points vs time");
    if (!scatter.points.length) {
      doc.fontSize(10).font(PDF_FONT).text("No data for this sprint.");
      return;
    }
    drawScatterChart(doc, scatter.points, {
      axisX: "Story points",
      axisY: "Minutes logged",
    });
    writeTable(
      doc,
      ["Task", "SP", "Minutes", "Assignee"],
      scatter.points.map((p) => [
        p.title,
        String(p.storyPoints),
        String(p.totalMinutes),
        p.assignee?.fullName ?? "—",
      ]),
      [200, 50, 70, 120],
    );
  });
}

async function buildTimePdf(
  userId: string,
  projectId: string,
  projectLabel: string,
  filters: { from?: string; to?: string; userId?: string; sprintId?: string },
): Promise<Buffer> {
  const report = await analyticsService.getTimeLogReport(userId, projectId, filters);

  return pdfBuffer((doc) => {
    writeTitle(doc, "Time logs", projectLabel);
    writeKeyValues(doc, [["Total", formatDurationMinutes(report.totalMinutes)]]);
    writeHeading(doc, "Entries");
    if (!report.items.length) {
      doc.fontSize(10).font(PDF_FONT).text("No time entries.");
      return;
    }
    writeTable(
      doc,
      ["Date", "User", "Task", "Sprint", "Duration", "Note"],
      report.items.map((r) => [
        r.loggedAt,
        r.userName,
        r.taskTitle,
        r.sprintName ?? "—",
        formatDurationMinutes(r.minutes),
        r.note ?? "",
      ]),
      [70, 80, 110, 70, 55, 90],
    );
  });
}

function activitySummary(action: string, meta: Record<string, unknown>): string {
  const title = String(meta.title ?? "");
  switch (action) {
    case "task.created":
      return `Task created: ${title}`;
    case "task.updated":
      return `Task updated: ${title}`;
    case "task.deleted":
      return `Task deleted: ${title}`;
    case "task.status_changed":
      return `Status changed: ${title} (${meta.from} → ${meta.to})`;
    case "sprint.created":
      return `Sprint created: ${meta.name ?? ""}`;
    case "comment.created":
      return `Comment on: ${title}`;
    default:
      return action.replace(/[._]/g, " ");
  }
}

async function buildActivityPdf(
  userId: string,
  projectId: string,
  projectLabel: string,
  limit: number,
): Promise<Buffer> {
  const activity = await activityService.listActivity(userId, projectId, { limit, offset: 0 });

  return pdfBuffer((doc) => {
    writeTitle(doc, "Activity log", projectLabel);
    writeHeading(doc, `Recent events (${activity.items.length})`);
    if (!activity.items.length) {
      doc.fontSize(10).font(PDF_FONT).text("No activity yet.");
      return;
    }
    writeTable(
      doc,
      ["When", "User", "Event"],
      activity.items.map((i) => [
        String(i.createdAt).slice(0, 16).replace("T", " "),
        i.user?.fullName ?? "—",
        activitySummary(i.action, (i.metadata ?? {}) as Record<string, unknown>),
      ]),
      [100, 90, 280],
    );
  });
}

export async function generateAnalyticsPdf(
  userId: string,
  projectId: string,
  options: AnalyticsPdfOptions,
): Promise<{ buffer: Buffer; filename: string }> {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }

  const projectLabel = await assertProjectName(projectId);
  const safeName = projectLabel.replace(/[^\w\-]+/g, "_").slice(0, 40) || "project";

  switch (options.report) {
    case "sprint": {
      if (!options.sprintId || !isUuidV4(options.sprintId)) {
        throw new AppError("Sprint id is required", 400);
      }
      const buffer = await buildSprintPdf(userId, projectId, options.sprintId, projectLabel);
      return { buffer, filename: `${safeName}-sprint-report.pdf` };
    }
    case "planning": {
      if (!options.sprintId || !isUuidV4(options.sprintId)) {
        throw new AppError("Sprint id is required", 400);
      }
      const buffer = await buildPlanningPdf(userId, projectId, options.sprintId, projectLabel);
      return { buffer, filename: `${safeName}-planning-report.pdf` };
    }
    case "time": {
      const buffer = await buildTimePdf(userId, projectId, projectLabel, {
        from: options.from,
        to: options.to,
        userId: options.userId,
        sprintId: options.sprintId,
      });
      return { buffer, filename: `${safeName}-time-logs.pdf` };
    }
    case "activity": {
      const limit = Math.min(Math.max(Number(options.activityLimit) || 50, 1), 100);
      const buffer = await buildActivityPdf(userId, projectId, projectLabel, limit);
      return { buffer, filename: `${safeName}-activity.pdf` };
    }
    default:
      throw new AppError("Invalid report type", 400);
  }
}
