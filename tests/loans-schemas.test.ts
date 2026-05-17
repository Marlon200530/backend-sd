import { describe, expect, it } from "vitest";

import {
  loanListQuerySchema,
  loanRejectSchema,
  loanStatusEnum,
} from "../src/modules/loans/loans.schemas.js";

describe("loan schemas", () => {
  it("accepts the full loan lifecycle statuses", () => {
    expect(loanStatusEnum.options).toEqual([
      "pending",
      "active",
      "overdue",
      "return_pending",
      "returned",
      "rejected",
      "cancelled",
    ]);
  });

  it("allows filtering pending and rejected loans", () => {
    expect(loanListQuerySchema.parse({ status: "pending" }).status).toBe("pending");
    expect(loanListQuerySchema.parse({ status: "rejected" }).status).toBe("rejected");
  });

  it("accepts an optional rejection reason", () => {
    expect(loanRejectSchema.parse({})).toEqual({});
    expect(loanRejectSchema.parse({ reason: "Outro pedido foi aprovado." })).toEqual({
      reason: "Outro pedido foi aprovado.",
    });
  });
});
