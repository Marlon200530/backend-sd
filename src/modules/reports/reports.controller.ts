import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/api-response.js";
import * as service from "./reports.service.js";
import type { ReportRangeQueryInput } from "./reports.schemas.js";

export async function overview(req: Request, res: Response) {
  return sendSuccess(res, 200, await service.overview(req.query as unknown as ReportRangeQueryInput));
}

export async function resources(req: Request, res: Response) {
  return sendSuccess(res, 200, await service.resourcesReport(req.query as unknown as ReportRangeQueryInput));
}

export async function loans(req: Request, res: Response) {
  return sendSuccess(res, 200, await service.loansReport(req.query as unknown as ReportRangeQueryInput));
}

export async function exportReport(req: Request, res: Response) {
  const query = req.query as unknown as ReportRangeQueryInput;
  const type = query.type ?? "loans";
  const csv = await service.exportCsv(query);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="nhluvuko-${type}.csv"`);
  return res.status(200).send(csv);
}
