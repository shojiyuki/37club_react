import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null;
type LogFields = Record<string, LogValue | undefined>;

const MAX_LOG_PATH_LENGTH = 300;

export function logServerEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  const record: Record<string, LogValue> = {
    timestamp: new Date().toISOString(),
    level,
    event,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      record[key] = value;
    }
  }

  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function getSafeRequestPath(req: Pick<Request, "path">): string {
  const path = req.path || "/";
  return path.slice(0, MAX_LOG_PATH_LENGTH);
}

export function createRequestLoggingMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();
    let logged = false;

    res.locals.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    const writeRequestLog = (aborted: boolean) => {
      if (logged) {
        return;
      }
      logged = true;

      const status = res.statusCode;
      if (!aborted && status < 400 && req.path === "/api/health") {
        return;
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const level: LogLevel = aborted || status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      logServerEvent(level, "http_request", {
        request_id: requestId,
        method: req.method,
        path: getSafeRequestPath(req),
        status,
        duration_ms: Math.round(durationMs),
        aborted,
      });
    };

    res.once("finish", () => writeRequestLog(false));
    res.once("close", () => writeRequestLog(!res.writableEnded));
    next();
  };
}

export function getRequestId(res: Pick<Response, "locals"> | undefined): string | undefined {
  const requestId = res?.locals?.requestId;
  return typeof requestId === "string" ? requestId : undefined;
}
