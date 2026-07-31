import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const SERVICE_TOKEN_ENV_NAME = "TOPIC_MANAGEMENT_SERVICE_TOKEN";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isTopicManagementServiceAuthorized(
  authorization: string | undefined,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken || expectedToken.length < 32 || !authorization) {
    return false;
  }

  const match = authorization.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    return false;
  }

  return timingSafeEqual(digest(match[1]), digest(expectedToken));
}

export function createTopicManagementAuthMiddleware(
  env: NodeJS.ProcessEnv = process.env,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const expectedToken = env[SERVICE_TOKEN_ENV_NAME];
    if (!expectedToken || expectedToken.length < 32) {
      res.status(503).json({
        ok: false,
        error: "TOPIC_MANAGEMENT_NOT_CONFIGURED",
      });
      return;
    }

    if (
      !isTopicManagementServiceAuthorized(
        req.header("authorization"),
        expectedToken,
      )
    ) {
      res.setHeader("WWW-Authenticate", "Bearer");
      res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      return;
    }

    next();
  };
}
