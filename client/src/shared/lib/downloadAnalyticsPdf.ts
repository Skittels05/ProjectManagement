import { downloadBlob } from "./exportReport";
import { http } from "../api/http";
import type { TimeLogReportFilters } from "../../store/api/analyticsApi";

export type AnalyticsPdfReport = "sprint" | "planning" | "time" | "activity";

export type DownloadAnalyticsPdfArg = {
  projectId: string;
  report: AnalyticsPdfReport;
  sprintId?: string;
  timeFilters?: TimeLogReportFilters;
  activityLimit?: number;
  filename?: string;
};

export async function downloadAnalyticsPdf(arg: DownloadAnalyticsPdfArg): Promise<void> {
  const body: Record<string, unknown> = { report: arg.report };
  if (arg.sprintId) body.sprintId = arg.sprintId;
  if (arg.timeFilters?.from) body.from = arg.timeFilters.from;
  if (arg.timeFilters?.to) body.to = arg.timeFilters.to;
  if (arg.timeFilters?.userId) body.userId = arg.timeFilters.userId;
  if (arg.timeFilters?.sprintId) body.sprintId = arg.timeFilters.sprintId;
  if (arg.activityLimit != null) body.activityLimit = arg.activityLimit;

  const response = await http.post(`/projects/${arg.projectId}/analytics/export/pdf`, body, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  let filename = arg.filename ?? "report.pdf";
  const match = disposition?.match(/filename="([^"]+)"/);
  if (match?.[1]) filename = match[1];

  downloadBlob(filename, response.data as Blob, "application/pdf");
}
