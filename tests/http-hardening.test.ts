import { describe, expect, it, vi } from "vitest";

import {
  createRateLimitMiddleware,
  getAllowedOrigins,
  getBodyLimit,
  getCorsOptions,
  getRateLimitOptions,
  isSensitiveTrpcRequest,
  parseCommaSeparatedEnv,
} from "../server/_core/http-hardening";

describe("http-hardening", () => {
  it("parses comma-separated environment values", () => {
    expect(parseCommaSeparatedEnv(" http://localhost:8081, https://example.com ,,")).toEqual([
      "http://localhost:8081",
      "https://example.com",
    ]);
  });

  it("uses local CORS defaults outside production", () => {
    expect(getAllowedOrigins({ NODE_ENV: "development" })).toEqual([
      "http://localhost:8081",
      "http://127.0.0.1:8081",
    ]);
  });

  it("does not allow browser origins by default in production", () => {
    expect(getAllowedOrigins({ NODE_ENV: "production" })).toEqual([]);
  });

  it("uses configured CORS origins and credentials", () => {
    expect(
      getCorsOptions({
        API_ALLOWED_ORIGINS: "https://app.example.com,http://localhost:8081",
        API_CORS_CREDENTIALS: "true",
      }),
    ).toEqual({
      allowedOrigins: ["https://app.example.com", "http://localhost:8081"],
      credentials: true,
    });
  });

  it("uses production body limit unless overridden", () => {
    expect(getBodyLimit({ NODE_ENV: "production" })).toBe("2mb");
    expect(getBodyLimit({ NODE_ENV: "development" })).toBe("50mb");
    expect(getBodyLimit({ NODE_ENV: "production", API_BODY_LIMIT: "1mb" })).toBe("1mb");
  });

  it("enables rate limiting by default only in production", () => {
    expect(getRateLimitOptions({ NODE_ENV: "production" }).enabled).toBe(true);
    expect(getRateLimitOptions({ NODE_ENV: "development" }).enabled).toBe(false);
  });

  it("detects sensitive tRPC requests", () => {
    expect(
      isSensitiveTrpcRequest({
        path: "/api/trpc/storage.createUploadUrl",
        originalUrl: "/api/trpc/storage.createUploadUrl?batch=1",
      }),
    ).toBe(true);

    expect(
      isSensitiveTrpcRequest({
        path: "/api/trpc/topics.list",
        originalUrl: "/api/trpc/topics.list?batch=1",
      }),
    ).toBe(false);
  });

  it("rate limits requests by IP", () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      windowMs: 60_000,
      max: 1,
      sensitiveMax: 1,
    });

    const next = vi.fn();
    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const header = vi.fn().mockReturnThis();
    const req = {
      ip: "127.0.0.1",
      socket: {},
      path: "/api/health",
      originalUrl: "/api/health",
    };
    const res = { header, status, json };

    middleware(req as never, res as never, next);
    middleware(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ error: "RATE_LIMITED" });
  });
});
