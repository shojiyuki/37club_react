import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import {
  createCorsMiddleware,
  createRateLimitMiddleware,
  createSecurityHeadersMiddleware,
  getBodyLimit,
} from "./http-hardening";
import {
  createRequestLoggingMiddleware,
  getRequestId,
  logServerEvent,
} from "./server-logger";
import { createTopicManagementAuthMiddleware } from "../topic-management/topic-management-auth";
import { createTopicManagementHandler } from "../topic-management/topic-management-handler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(createRequestLoggingMiddleware());
  app.use(createSecurityHeadersMiddleware());
  app.use(createCorsMiddleware());
  app.use(createRateLimitMiddleware());

  const bodyLimit = getBodyLimit();
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.post(
    "/api/internal/topic-management",
    createTopicManagementAuthMiddleware(),
    createTopicManagementHandler(),
  );

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type, ctx }) {
        logServerEvent("error", "trpc_error", {
          request_id: ctx?.requestId,
          procedure: path,
          procedure_type: type,
          error_code: error.code,
          error_name:
            error.cause instanceof Error ? error.cause.name : error.name,
        });
      },
    }),
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logServerEvent("error", "express_error", {
        request_id: getRequestId(res),
        error_name: error instanceof Error ? error.name : "UnknownError",
      });

      if (!res.headersSent) {
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
      }
    },
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logServerEvent("warn", "api_port_fallback", {
      preferred_port: preferredPort,
      port,
    });
  }

  server.listen(port, () => {
    logServerEvent("info", "api_started", { port });
  });
}

startServer().catch((error: unknown) => {
  logServerEvent("error", "api_start_failed", {
    error_name: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
