import type { NextFunction, Request, RequestHandler, Response } from "express";

const DEFAULT_DEVELOPMENT_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081"];
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 300;
const DEFAULT_SENSITIVE_RATE_LIMIT_MAX = 30;
const SENSITIVE_TRPC_PATHS = ["storage.createUploadUrl", "participation.checkIn", "chat.sendMessage"];

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

type CorsOptions = {
  allowedOrigins: string[];
  credentials: boolean;
};

type RateLimitOptions = {
  enabled: boolean;
  windowMs: number;
  max: number;
  sensitiveMax: number;
};

type Env = Record<string, string | undefined>;

export function parseCommaSeparatedEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(env: Env = process.env): string[] {
  const configuredOrigins = parseCommaSeparatedEnv(env.API_ALLOWED_ORIGINS);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (env.NODE_ENV === "production") {
    return [];
  }

  return DEFAULT_DEVELOPMENT_ORIGINS;
}

export function getBodyLimit(env: Env = process.env): string {
  if (env.API_BODY_LIMIT) {
    return env.API_BODY_LIMIT;
  }

  return env.NODE_ENV === "production" ? "2mb" : "50mb";
}

function getBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getPositiveIntegerEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCorsOptions(env: Env = process.env): CorsOptions {
  return {
    allowedOrigins: getAllowedOrigins(env),
    credentials: getBooleanEnv(env.API_CORS_CREDENTIALS, false),
  };
}

export function getRateLimitOptions(env: Env = process.env): RateLimitOptions {
  return {
    enabled: getBooleanEnv(env.API_RATE_LIMIT_ENABLED, env.NODE_ENV === "production"),
    windowMs: getPositiveIntegerEnv(env.API_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    max: getPositiveIntegerEnv(env.API_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
    sensitiveMax: getPositiveIntegerEnv(env.API_SENSITIVE_RATE_LIMIT_MAX, DEFAULT_SENSITIVE_RATE_LIMIT_MAX),
  };
}

export function createCorsMiddleware(options: CorsOptions = getCorsOptions()): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const isOriginAllowed = !origin || options.allowedOrigins.includes(origin);

    if (origin && isOriginAllowed) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (options.credentials) {
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(isOriginAllowed ? 204 : 403);
      return;
    }

    next();
  };
}

export function createSecurityHeadersMiddleware(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "no-referrer");
    res.header("X-Frame-Options", "DENY");
    next();
  };
}

export function isSensitiveTrpcRequest(req: Pick<Request, "path" | "originalUrl">): boolean {
  const target = `${req.path} ${req.originalUrl}`;
  return SENSITIVE_TRPC_PATHS.some((path) => target.includes(path));
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimitMiddleware(
  options: RateLimitOptions = getRateLimitOptions(),
  store: RateLimitStore = new Map(),
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.enabled) {
      next();
      return;
    }

    const now = Date.now();
    const clientIp = getClientIp(req);
    const isSensitive = isSensitiveTrpcRequest(req);
    const limit = isSensitive ? options.sensitiveMax : options.max;
    const key = `${clientIp}:${isSensitive ? "sensitive" : "global"}`;
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.header("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "RATE_LIMITED" });
      return;
    }

    next();
  };
}
