import type { Request, Response } from "express";
import { segment } from "../../utils/route-params";
import * as analyticsPdfService from "./analytics-pdf.service";

export async function exportPdf(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const report = String(body.report ?? "");
  if (!["sprint", "planning", "time", "activity"].includes(report)) {
    res.status(400).json({ message: "Invalid report type" });
    return;
  }

  const { buffer, filename } = await analyticsPdfService.generateAnalyticsPdf(
    req.user!.id,
    segment(req.params.projectId),
    {
      report: report as analyticsPdfService.AnalyticsPdfReport,
      sprintId: body.sprintId != null ? String(body.sprintId) : undefined,
      from: body.from != null ? String(body.from) : undefined,
      to: body.to != null ? String(body.to) : undefined,
      userId: body.userId != null ? String(body.userId) : undefined,
      activityLimit: body.activityLimit != null ? Number(body.activityLimit) : undefined,
    },
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}
