import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import {
  createRequestLoggingMiddleware,
  getSafeRequestPath,
  logReportCreated,
  logServerEvent,
} from "../server/_core/server-logger";

describe("server-logger", () => {
  it("uses req.path and never includes a query string", () => {
    expect(getSafeRequestPath({ path: "/api/trpc/chat.sendMessage" } as never)).toBe(
      "/api/trpc/chat.sendMessage",
    );
  });

  it("writes structured JSON without serializing Error objects", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerEvent("error", "test_error", {
      request_id: "request-1",
      error_name: "TypeError",
    });

    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "error",
      event: "test_error",
      request_id: "request-1",
      error_name: "TypeError",
    });
    expect(record.timestamp).toEqual(expect.any(String));
    output.mockRestore();
  });

  it("adds a request ID and logs failed requests", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = Object.assign(new EventEmitter(), {
      locals: {},
      statusCode: 503,
      writableEnded: true,
      setHeader: vi.fn(),
    });
    const req = {
      method: "POST",
      path: "/api/trpc/chat.sendMessage",
    };
    const next = vi.fn();

    createRequestLoggingMiddleware()(req as never, res as never, next);
    res.emit("finish");

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", expect.any(String));
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      event: "http_request",
      method: "POST",
      path: "/api/trpc/chat.sendMessage",
      status: 503,
    });
    output.mockRestore();
  });

  it("does not log successful health checks", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const res = Object.assign(new EventEmitter(), {
      locals: {},
      statusCode: 200,
      writableEnded: true,
      setHeader: vi.fn(),
    });

    createRequestLoggingMiddleware()(
      { method: "GET", path: "/api/health" } as never,
      res as never,
      vi.fn(),
    );
    res.emit("finish");

    expect(output).not.toHaveBeenCalled();
    output.mockRestore();
  });

  it("logs only non-sensitive fields for a created report", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logReportCreated({
      reportId: 30,
      targetType: "message",
      status: "pending",
    });

    const serialized = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(serialized);
    expect(record).toMatchObject({
      level: "info",
      event: "report_created",
      report_id: 30,
      target_type: "message",
      status: "pending",
    });
    expect(record).not.toHaveProperty("details");
    expect(record).not.toHaveProperty("body");
    expect(record).not.toHaveProperty("email");
    expect(record).not.toHaveProperty("image_url");
    output.mockRestore();
  });
});
