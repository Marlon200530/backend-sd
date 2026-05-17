import { count, eq } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { loans, resources, users } from "../../db/schema.js";
import type { ReportRangeQueryInput } from "./reports.schemas.js";

export async function overview(query: ReportRangeQueryInput) {
  const [
    [usersTotal],
    [usersActive],
    [resourcesTotal],
    [resourcesAvailable],
    [resourcesRequisitioned],
    [resourcesHidden],
    [resourcesRemoved],
    [loansTotal],
    [loansActive],
    [loansOverdue],
    [loansReturned],
    [loansCancelled],
  ] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(users).where(eq(users.isActive, true)),
    db.select({ total: count() }).from(resources),
    db.select({ total: count() }).from(resources).where(eq(resources.status, "available")),
    db.select({ total: count() }).from(resources).where(eq(resources.status, "requisitioned")),
    db.select({ total: count() }).from(resources).where(eq(resources.status, "hidden")),
    db.select({ total: count() }).from(resources).where(eq(resources.status, "removed")),
    db.select({ total: count() }).from(loans),
    db.select({ total: count() }).from(loans).where(eq(loans.status, "active")),
    db.select({ total: count() }).from(loans).where(eq(loans.status, "overdue")),
    db.select({ total: count() }).from(loans).where(eq(loans.status, "returned")),
    db.select({ total: count() }).from(loans).where(eq(loans.status, "cancelled")),
  ]);

  return {
    period: { from: query.from ?? null, to: query.to ?? null },
    users: {
      total: usersTotal?.total ?? 0,
      active: usersActive?.total ?? 0,
    },
    resources: {
      total: resourcesTotal?.total ?? 0,
      available: resourcesAvailable?.total ?? 0,
      requisitioned: resourcesRequisitioned?.total ?? 0,
      hidden: resourcesHidden?.total ?? 0,
      removed: resourcesRemoved?.total ?? 0,
    },
    loans: {
      total: loansTotal?.total ?? 0,
      active: loansActive?.total ?? 0,
      overdue: loansOverdue?.total ?? 0,
      returned: loansReturned?.total ?? 0,
      cancelled: loansCancelled?.total ?? 0,
    },
  };
}

export async function resourcesReport(_query: ReportRangeQueryInput) {
  return db.select().from(resources);
}

export async function loansReport(_query: ReportRangeQueryInput) {
  return db.select().from(loans);
}

export async function exportCsv(query: ReportRangeQueryInput) {
  const type = query.type ?? "loans";
  const rows =
    type === "users"
      ? await db.select().from(users)
      : type === "resources"
        ? await db.select().from(resources)
        : await db.select().from(loans);

  if (rows.length === 0) {
    return "id\n";
  }

  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const lines = rows.map((row) =>
    headers
      .map((header) => JSON.stringify((row as Record<string, unknown>)[header] ?? ""))
      .join(","),
  );

  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}
