import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/api-response.js";
import { requireAuthenticatedUser } from "../../utils/authenticated-user.js";
import * as loansService from "./loans.service.js";
import type { LoanIdParamsInput, LoanListQueryInput } from "./loans.schemas.js";

export async function create(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  return sendSuccess(res, 201, await loansService.createLoan(req.body, user.id));
}

export async function list(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const query = req.query as unknown as LoanListQueryInput;
  const result = await loansService.listLoans(query, user);
  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

export async function detail(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.getLoan(params.id, user));
}

export async function returnLoan(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.returnLoan(params.id, req.body, user));
}

export async function confirmReturn(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.confirmLoanReturn(params.id, req.body, user));
}

export async function approve(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.approveLoan(params.id, user));
}

export async function reject(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.rejectLoan(params.id, req.body, user));
}

export async function cancel(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as LoanIdParamsInput;
  return sendSuccess(res, 200, await loansService.cancelLoan(params.id, req.body, user.id));
}
