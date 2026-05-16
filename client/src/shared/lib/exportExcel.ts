import ExcelJS from "exceljs";
import type {
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
import { downloadBlob } from "./exportReport";

async function writeWorkbook(filename: string, workbook: ExcelJS.Workbook): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`, blob);
}

async function addChartImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  svgFragment: string,
  anchorRow: number,
): Promise<number> {
  try {
    const base64 = await svgMarkupToPngBase64(svgFragment);
    if (!base64) return anchorRow;
    const imageId = workbook.addImage({ base64, extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: 0, row: anchorRow },
      ext: { width: 520, height: 260 },
    });
    return anchorRow + 16;
  } catch {
    return anchorRow;
  }
}

export async function downloadSprintExcel(
  filename: string,
  stats: SprintStatsDto,
  burndown: BurndownDto,
  velocity: VelocityDto | undefined,
  formatDuration: (minutes: number) => string,
  burndownLabels: BurndownChartLabels,
  sheetNames: { summary: string; burndown: string; velocity: string },
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Project Management";

  const summary = wb.addWorksheet(sheetNames.summary);
  summary.columns = [{ width: 28 }, { width: 18 }];
  summary.addRow(["Sprint", stats.sprint.name]);
  summary.addRow(["Period", `${stats.sprint.startsAt} — ${stats.sprint.endsAt}`]);
  summary.addRow(["Status", stats.sprint.status]);
  summary.addRow(["Tasks", stats.totalTasks]);
  summary.addRow(["Committed SP", stats.committedStoryPoints]);
  summary.addRow(["Completed SP", stats.completedStoryPoints]);
  summary.addRow(["Completion %", stats.completionPercent]);
  summary.addRow(["Time logged", formatDuration(stats.totalLoggedMinutes)]);
  summary.addRow([
    "To do / In progress / Done",
    `${stats.byStatus.todo} / ${stats.byStatus.in_progress} / ${stats.byStatus.done}`,
  ]);

  const burndownSheet = wb.addWorksheet(sheetNames.burndown);
  let row = 1;
  const chartSvg = burndownChartSvg(burndown.points, burndown.committedStoryPoints, burndownLabels);
  if (chartSvg) {
    row = await addChartImage(wb, burndownSheet, chartSvg, 0);
  }
  burndownSheet.getRow(row).values = ["Date", "Ideal SP", "Actual SP"];
  burndownSheet.getRow(row).font = { bold: true };
  row += 1;
  for (const p of burndown.points) {
    burndownSheet.getRow(row).values = [p.date, p.ideal, p.actual];
    row += 1;
  }
  burndownSheet.columns = [{ width: 14 }, { width: 12 }, { width: 12 }];

  if (velocity?.sprints.length) {
    const vel = wb.addWorksheet(sheetNames.velocity);
    vel.getRow(1).values = ["Sprint", "Completed SP", "Ends"];
    vel.getRow(1).font = { bold: true };
    velocity.sprints.forEach((s, i) => {
      vel.getRow(i + 2).values = [s.name, s.completedStoryPoints, s.endsAt];
    });
    if (velocity.averageCompletedStoryPoints != null) {
      const r = velocity.sprints.length + 2;
      vel.getRow(r).values = ["Average", velocity.averageCompletedStoryPoints, ""];
    }
    vel.columns = [{ width: 24 }, { width: 14 }, { width: 14 }];
  }

  await writeWorkbook(filename, wb);
}

export async function downloadScatterExcel(
  filename: string,
  points: ScatterPointDto[],
  scatterLabels: ScatterChartLabels,
  sheetName: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetName);
  let row = 1;
  const chartSvg = scatterChartSvg(points, scatterLabels);
  if (chartSvg) {
    row = await addChartImage(wb, sheet, chartSvg, 0);
  }
  sheet.getRow(row).values = ["Task", "Story points", "Minutes", "Assignee"];
  sheet.getRow(row).font = { bold: true };
  row += 1;
  for (const p of points) {
    sheet.getRow(row).values = [p.title, p.storyPoints, p.totalMinutes, p.assignee?.fullName ?? ""];
    row += 1;
  }
  sheet.columns = [{ width: 36 }, { width: 14 }, { width: 12 }, { width: 22 }];
  await writeWorkbook(filename, wb);
}

export async function downloadTimeLogExcel(
  filename: string,
  report: TimeLogReportDto,
  formatDuration: (minutes: number) => string,
  sheetNames: { logs: string; summary: string },
): Promise<void> {
  const wb = new ExcelJS.Workbook();

  const logs = wb.addWorksheet(sheetNames.logs);
  logs.getRow(1).values = ["Date", "User", "Task", "Sprint", "Minutes", "Note"];
  logs.getRow(1).font = { bold: true };
  report.items.forEach((r, i) => {
    logs.getRow(i + 2).values = [
      r.loggedAt,
      r.userName,
      r.taskTitle,
      r.sprintName ?? "",
      r.minutes,
      r.note ?? "",
    ];
  });
  logs.columns = [{ width: 12 }, { width: 18 }, { width: 30 }, { width: 16 }, { width: 10 }, { width: 24 }];

  const summary = wb.addWorksheet(sheetNames.summary);
  summary.addRow(["Total minutes", report.totalMinutes]);
  summary.addRow(["Total formatted", formatDuration(report.totalMinutes)]);
  summary.addRow([]);
  summary.getRow(4).values = ["User", "Minutes"];
  summary.getRow(4).font = { bold: true };
  report.summaryByUser.forEach((s, i) => {
    summary.getRow(i + 5).values = [s.userName, s.minutes];
  });

  await writeWorkbook(filename, wb);
}

export async function downloadActivityExcel(
  filename: string,
  items: { createdAt: string; userName: string; details: string }[],
  sheetName: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetName);
  sheet.getRow(1).values = ["When", "User", "Event"];
  sheet.getRow(1).font = { bold: true };
  items.forEach((row, i) => {
    sheet.getRow(i + 2).values = [row.createdAt, row.userName, row.details];
  });
  sheet.columns = [{ width: 22 }, { width: 20 }, { width: 60 }];
  await writeWorkbook(filename, wb);
}
