import { AppError } from "../../error/app-error.js";
import { resourcesRepository } from "../resources/resources.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as loansRepository from "./loans.repository.js";
import type {
  LoanCancelInput,
  LoanCreateInput,
  LoanListQueryInput,
  LoanRejectInput,
  LoanReturnInput,
} from "./loans.schemas.js";

type UserRole = "student" | "admin";

function assertLoanAccess(loan: { borrowerId: string; ownerId: string }, user: { id: string; role: UserRole }) {
  if (user.role === "admin") return;
  if (loan.borrowerId === user.id || loan.ownerId === user.id) return;

  throw new AppError(403, "FORBIDDEN", "Sem permissão para aceder a esta requisição.");
}

export async function createLoan(input: LoanCreateInput, borrowerId: string) {
  const result = await loansRepository.createLoan({ ...input, borrowerId });

  if (result.kind === "resource-not-found") {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
  }

  if (result.kind === "self-loan") {
    throw new AppError(422, "LOAN_SELF_FORBIDDEN", "Não pode requisitar o próprio recurso.");
  }

  if (result.kind === "resource-unavailable") {
    throw new AppError(422, "RESOURCE_NOT_AVAILABLE", "Recurso não está disponível.");
  }

  if (result.kind === "loan-exists") {
    throw new AppError(409, "RESOURCE_ALREADY_LOANED", "Recurso já requisitado.");
  }

  if (result.kind === "create-failed") {
    throw new AppError(500, "LOAN_CREATE_FAILED", "Não foi possível criar a requisição.");
  }

  const resource = await resourcesRepository.findById(result.loan.resourceId);

  if (resource) {
    await notificationsService.create({
      userId: result.loan.ownerId,
      type: "loan_created",
      title: "Novo pedido de requisição",
      message: `Recebeste um pedido para requisitar "${resource.title}".`,
      entityType: "loan",
      entityId: result.loan.id,
    });
  }

  return result.loan;
}

export async function listLoans(query: LoanListQueryInput, user: { id: string; role: UserRole }) {
  const result = await loansRepository.listLoans(query, user);

  return {
    data: result.rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getLoan(id: string, user: { id: string; role: UserRole }) {
  const loan = await loansRepository.findLoanById(id);

  if (!loan) {
    throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
  }

  assertLoanAccess(loan, user);
  return loan;
}

export async function returnLoan(id: string, input: LoanReturnInput, user: { id: string; role: UserRole }) {
  const loan = await getLoan(id, user);

  if (user.role !== "admin" && loan.borrowerId !== user.id && loan.ownerId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Apenas o requisitante, dono do recurso ou admin pode devolver.");
  }

  if (user.role !== "admin" && loan.borrowerId === user.id) {
    const requestInput: { id: string; actorId: string; notes?: string } = {
      id,
      actorId: user.id,
    };

    if (input.returnNotes !== undefined) requestInput.notes = input.returnNotes;

    const result = await loansRepository.requestLoanReturn(requestInput);

    if (!result) throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
    if (result.kind === "already-closed") throw new AppError(422, "LOAN_ALREADY_CLOSED", "Requisição já fechada.");
    if (result.kind === "already-requested") throw new AppError(422, "RETURN_ALREADY_REQUESTED", "A devolução já está a aguardar confirmação do dono.");
    if (result.kind === "not-active") throw new AppError(422, "LOAN_NOT_ACTIVE", "Apenas requisições activas podem pedir devolução.");
    if (result.kind === "update-failed") throw new AppError(500, "LOAN_UPDATE_FAILED", "Não foi possível actualizar a requisição.");

    const resource = await resourcesRepository.findById(result.loan.resourceId);

    if (resource) {
      await notificationsService.create({
        userId: result.loan.ownerId,
        type: "return_requested",
        title: "Pedido de devolução",
        message: `O requisitante pediu a confirmação da devolução de "${resource.title}".`,
        entityType: "loan",
        entityId: result.loan.id,
      });
    }

    return result.loan;
  }

  return confirmLoanReturn(id, input, user);
}

export async function confirmLoanReturn(id: string, input: LoanReturnInput, user: { id: string; role: UserRole }) {
  const loan = await getLoan(id, user);

  if (user.role !== "admin" && loan.ownerId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Apenas o dono do recurso ou admin pode confirmar a devolução.");
  }

  const closeInput: { id: string; actorId: string; status: "returned"; notes?: string } = {
    id,
    actorId: user.id,
    status: "returned",
  };

  if (input.returnNotes !== undefined) closeInput.notes = input.returnNotes;

  const result = await loansRepository.closeLoan(closeInput);

  if (!result) throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
  if (result.kind === "already-closed") throw new AppError(422, "LOAN_ALREADY_CLOSED", "Requisição já fechada.");
  if (result.kind === "not-active") throw new AppError(422, "LOAN_NOT_ACTIVE", "Apenas requisições activas ou com devolução pendente podem ser devolvidas.");
  if (result.kind === "update-failed") throw new AppError(500, "LOAN_UPDATE_FAILED", "Não foi possível actualizar a requisição.");

  const resource = await resourcesRepository.findById(result.loan.resourceId);

  if (resource) {
    await notificationsService.create({
      userId: result.loan.borrowerId,
      type: "resource_returned",
      title: "Recurso devolvido",
      message: `A devolução do recurso "${resource.title}" foi confirmada.`,
      entityType: "loan",
      entityId: result.loan.id,
    });
  }

  return result.loan;
}

export async function cancelLoan(id: string, input: LoanCancelInput, adminId: string) {
  const result = await loansRepository.closeLoan({
    id,
    actorId: adminId,
    status: "cancelled",
    notes: input.reason,
  });

  if (!result) throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
  if (result.kind === "already-closed") throw new AppError(422, "LOAN_ALREADY_CLOSED", "Requisição já fechada.");
  if (result.kind === "not-active") throw new AppError(422, "LOAN_NOT_ACTIVE", "Apenas requisições activas podem ser canceladas.");
  if (result.kind === "update-failed") throw new AppError(500, "LOAN_UPDATE_FAILED", "Não foi possível actualizar a requisição.");
  return result.loan;
}

export async function approveLoan(id: string, user: { id: string; role: UserRole }) {
  const loan = await getLoan(id, user);

  if (user.role !== "admin" && loan.ownerId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Apenas o dono do recurso ou admin pode aprovar.");
  }

  const result = await loansRepository.approveLoan({ id, actorId: user.id });

  if (result.kind === "loan-not-found") throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
  if (result.kind === "loan-not-pending") throw new AppError(422, "LOAN_NOT_PENDING", "Apenas requisições pendentes podem ser aprovadas.");
  if (result.kind === "resource-not-found") throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
  if (result.kind === "resource-unavailable") throw new AppError(422, "RESOURCE_NOT_AVAILABLE", "Recurso não está disponível.");
  if (result.kind === "update-failed") throw new AppError(500, "LOAN_UPDATE_FAILED", "Não foi possível actualizar a requisição.");

  await notificationsService.create({
    userId: result.loan.borrowerId,
    type: "loan_approved",
    title: "Requisição aprovada",
    message: `A tua requisição do recurso "${result.resource.title}" foi aprovada.`,
    entityType: "loan",
    entityId: result.loan.id,
  });

  await Promise.all(
    result.rejectedLoans.map((rejectedLoan) =>
      notificationsService.create({
        userId: rejectedLoan.borrowerId,
        type: "loan_rejected",
        title: "Requisição rejeitada",
        message: `A tua requisição do recurso "${result.resource.title}" foi rejeitada porque outro pedido foi aprovado.`,
        entityType: "loan",
        entityId: rejectedLoan.id,
      }),
    ),
  );

  return result.loan;
}

export async function rejectLoan(id: string, input: LoanRejectInput, user: { id: string; role: UserRole }) {
  const loan = await getLoan(id, user);

  if (user.role !== "admin" && loan.ownerId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Apenas o dono do recurso ou admin pode rejeitar.");
  }

  const result = await loansRepository.rejectLoan({
    id,
    actorId: user.id,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  });

  if (result.kind === "loan-not-found") throw new AppError(404, "LOAN_NOT_FOUND", "Requisição não encontrada.");
  if (result.kind === "loan-not-pending") throw new AppError(422, "LOAN_NOT_PENDING", "Apenas requisições pendentes podem ser rejeitadas.");
  if (result.kind === "update-failed") throw new AppError(500, "LOAN_UPDATE_FAILED", "Não foi possível actualizar a requisição.");

  const resource = await resourcesRepository.findById(result.loan.resourceId);

  await notificationsService.create({
    userId: result.loan.borrowerId,
    type: "loan_rejected",
    title: "Requisição rejeitada",
    message: `A tua requisição${resource ? ` do recurso "${resource.title}"` : ""} foi rejeitada.`,
    entityType: "loan",
    entityId: result.loan.id,
  });

  return result.loan;
}
