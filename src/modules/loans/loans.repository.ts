import { and, count, desc, eq, or, type SQL } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { loanEvents, loans, resources } from "../../db/schema.js";
import type { LoanCreateInput, LoanListQueryInput } from "./loans.schemas.js";

type UserRole = "student" | "admin";

export async function findLoanById(id: string) {
  const [loan] = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return loan ?? null;
}

export async function listLoans(query: LoanListQueryInput, viewer: { id: string; role: UserRole }) {
  const conditions: SQL[] = [];

  if (viewer.role !== "admin") {
    conditions.push(or(eq(loans.borrowerId, viewer.id), eq(loans.ownerId, viewer.id))!);
  }

  if (query.status) conditions.push(eq(loans.status, query.status));
  if (query.resourceId) conditions.push(eq(loans.resourceId, query.resourceId));
  if (query.borrowerId) conditions.push(eq(loans.borrowerId, query.borrowerId));
  if (query.ownerId) conditions.push(eq(loans.ownerId, query.ownerId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [totalRow]] = await Promise.all([
    db.select().from(loans).where(where).orderBy(desc(loans.createdAt)).limit(query.limit).offset(offset),
    db.select({ total: count() }).from(loans).where(where),
  ]);

  return { rows, total: totalRow?.total ?? 0 };
}

export async function createLoan(input: LoanCreateInput & { borrowerId: string }) {
  return db.transaction(async (tx) => {
    const [resource] = await tx
      .select()
      .from(resources)
      .where(eq(resources.id, input.resourceId))
      .limit(1);

    if (!resource) return { kind: "resource-not-found" as const };
    if (resource.ownerId === input.borrowerId) return { kind: "self-loan" as const };
    if (resource.status !== "available") return { kind: "resource-unavailable" as const };

    const [activeLoan] = await tx
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.resourceId, resource.id),
          eq(loans.borrowerId, input.borrowerId),
          or(eq(loans.status, "pending"), eq(loans.status, "active"), eq(loans.status, "overdue")),
        ),
      )
      .limit(1);

    if (activeLoan) return { kind: "loan-exists" as const };

    const [loan] = await tx
      .insert(loans)
      .values({
        resourceId: resource.id,
        borrowerId: input.borrowerId,
        ownerId: resource.ownerId,
        dueDate: input.dueDate,
        status: "pending",
      })
      .returning();

    if (!loan) return { kind: "create-failed" as const };

    await tx.insert(loanEvents).values({
      loanId: loan.id,
      actorId: input.borrowerId,
      eventType: "created",
    });

    return { kind: "created" as const, loan };
  });
}

export async function approveLoan(input: { id: string; actorId: string }) {
  return db.transaction(async (tx) => {
    const [loan] = await tx.select().from(loans).where(eq(loans.id, input.id)).limit(1);

    if (!loan) return { kind: "loan-not-found" as const };
    if (loan.status !== "pending") return { kind: "loan-not-pending" as const, loan };

    const [resource] = await tx.select().from(resources).where(eq(resources.id, loan.resourceId)).limit(1);

    if (!resource) return { kind: "resource-not-found" as const };
    if (resource.status !== "available") return { kind: "resource-unavailable" as const, loan, resource };

    const [approvedLoan] = await tx
      .update(loans)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(loans.id, loan.id))
      .returning();

    if (!approvedLoan) return { kind: "update-failed" as const };

    const rejectedLoans = await tx
      .update(loans)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(loans.resourceId, loan.resourceId),
          eq(loans.status, "pending"),
        ),
      )
      .returning();

    await tx
      .update(resources)
      .set({ preLoanStatus: resource.status, status: "requisitioned", updatedAt: new Date() })
      .where(eq(resources.id, resource.id));

    await tx.insert(loanEvents).values({
      loanId: loan.id,
      actorId: input.actorId,
      eventType: "created",
      notes: "Loan approved",
    });

    return {
      kind: "approved" as const,
      loan: approvedLoan,
      rejectedLoans,
      resource,
    };
  });
}

export async function rejectLoan(input: { id: string; actorId: string; reason?: string }) {
  return db.transaction(async (tx) => {
    const [loan] = await tx.select().from(loans).where(eq(loans.id, input.id)).limit(1);

    if (!loan) return { kind: "loan-not-found" as const };
    if (loan.status !== "pending") return { kind: "loan-not-pending" as const, loan };

    const [rejectedLoan] = await tx
      .update(loans)
      .set({ status: "rejected", returnNotes: input.reason, updatedAt: new Date() })
      .where(eq(loans.id, loan.id))
      .returning();

    if (!rejectedLoan) return { kind: "update-failed" as const };

    await tx.insert(loanEvents).values({
      loanId: loan.id,
      actorId: input.actorId,
      eventType: "cancelled",
      notes: input.reason ?? "Loan rejected",
    });

    return { kind: "rejected" as const, loan: rejectedLoan };
  });
}

export async function requestLoanReturn(input: { id: string; actorId: string; notes?: string }) {
  return db.transaction(async (tx) => {
    const [loan] = await tx.select().from(loans).where(eq(loans.id, input.id)).limit(1);

    if (!loan) return null;
    if (loan.status === "returned" || loan.status === "cancelled") return { kind: "already-closed" as const };
    if (loan.status === "return_pending") return { kind: "already-requested" as const, loan };
    if (loan.status === "pending" || loan.status === "rejected") return { kind: "not-active" as const, loan };

    const [updatedLoan] = await tx
      .update(loans)
      .set({
        status: "return_pending",
        returnNotes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loan.id))
      .returning();

    if (!updatedLoan) return { kind: "update-failed" as const };

    await tx.insert(loanEvents).values({
      loanId: loan.id,
      actorId: input.actorId,
      eventType: "return_requested",
      notes: input.notes,
    });

    return { kind: "requested" as const, loan: updatedLoan };
  });
}

export async function closeLoan(input: {
  id: string;
  actorId: string;
  status: "returned" | "cancelled";
  notes?: string;
}) {
  return db.transaction(async (tx) => {
    const [loan] = await tx.select().from(loans).where(eq(loans.id, input.id)).limit(1);

    if (!loan) return null;
    if (loan.status === "returned" || loan.status === "cancelled") return { kind: "already-closed" as const };
    if (loan.status === "pending" || loan.status === "rejected") return { kind: "not-active" as const, loan };

    const [resource] = await tx.select().from(resources).where(eq(resources.id, loan.resourceId)).limit(1);
    const restoredStatus = resource?.preLoanStatus === "hidden" ? "hidden" : "available";

    const [updatedLoan] = await tx
      .update(loans)
      .set({
        status: input.status,
        returnedAt: new Date(),
        returnNotes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loan.id))
      .returning();

    if (!updatedLoan) return { kind: "update-failed" as const };

    if (resource) {
      await tx
        .update(resources)
        .set({ status: restoredStatus, preLoanStatus: null, updatedAt: new Date() })
        .where(eq(resources.id, resource.id));
    }

    await tx.insert(loanEvents).values({
      loanId: loan.id,
      actorId: input.actorId,
      eventType: input.status,
      notes: input.notes,
    });

    return { kind: "closed" as const, loan: updatedLoan };
  });
}
