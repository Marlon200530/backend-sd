import { describe, expect, it } from "vitest";

import { AppError } from "../src/error/app-error.js";
import { extractBearerTokenValue, parseJwtToken } from "../src/jwt/jwt-input.js";

const token = "header.payload.signature";

describe("auth input parsing", () => {
  it("extracts a valid bearer token", () => {
    expect(extractBearerTokenValue(`Bearer ${token}`)).toBe(token);
  });

  it("accepts bearer scheme case-insensitively", () => {
    expect(extractBearerTokenValue(`bearer ${token}`)).toBe(token);
  });

  it("rejects missing authorization headers", () => {
    expect(() => extractBearerTokenValue(undefined)).toThrow(AppError);
  });

  it("rejects malformed bearer headers", () => {
    expect(() => extractBearerTokenValue(token)).toThrow(AppError);
    expect(() => extractBearerTokenValue(`Bearer ${token} extra`)).toThrow(AppError);
  });

  it("rejects malformed JWT values before verification", () => {
    expect(() => parseJwtToken("not-a-jwt")).toThrow(AppError);
    expect(() => parseJwtToken("a.b.c.d")).toThrow(AppError);
    expect(() => parseJwtToken("")).toThrow(AppError);
  });
});
