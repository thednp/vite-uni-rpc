// src/createMid.ts
import process from "node:process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { readBody } from "./utils";
import { getCookies } from "./cookie";
import { serverFunctionsMap } from "./registry";
import type { MiddlewareOptions } from "./types";
import { defaultRPCOptions } from "./options";

const middlewareDefaults: MiddlewareOptions = {
  rpcPrefix: undefined,
  path: undefined,
  headers: {},
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1000, // 5m
  },
  handler: undefined,
  onError: undefined,
};

export const createMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {},
) => {
  const { rpcPrefix, path, headers, rateLimit, handler, onError } = {
    ...middlewareDefaults,
    ...initialOptions,
  };

  // Rate limiting state if enabled
  const rateLimitStore = rateLimit
    ? new Map<string, { count: number; resetTime: number }>()
    : null;

  return async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
    next: Connect.NextFunction,
  ) => {
    try {
      // Path matching
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(req.url || "")) return next?.();
        
      }
      // rpcPrefix matching
      if (rpcPrefix && !req.url?.startsWith(rpcPrefix)) {
        return next?.();
      }

      // Set custom headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          res?.setHeader(key, value);
          res?.header(key, value);
        });
      }

      // Rate limiting check
      if (rateLimitStore) {
        const clientIp = req.socket.remoteAddress || "unknown";
        const now = Date.now();
        const clientState = rateLimitStore.get(clientIp) || {
          count: 0,
          resetTime: now + rateLimit!.windowMs,
        };

        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now + rateLimit!.windowMs;
        }

        if (clientState.count >= rateLimit!.max) {
          res.statusCode = 429;
          res.end("Too Many Requests");
          return;
        }

        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }

      // Execute handler if provided
      if (handler) {
        return await handler(req, res, next);
      }

      return next?.();
    } catch (error) {
      if (onError) {
        onError(error as Error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  };
};

// Create RPC middleware
export const createRPCMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {},
) => {
  const options = { ...defaultRPCOptions, ...initialOptions };

  return createMiddleware({
    ...options,
    handler: async (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      next: Connect.NextFunction
    ) => {
      if (!req.url?.startsWith(`/${options.rpcPrefix}/`)) {
        return next?.();
      }

      const cookies = getCookies(req?.headers?.cookie || req?.header?.("cookie"));
      const csrfToken = cookies["X-CSRF-Token"];

      if (!csrfToken) {
        if (process.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware")
        }
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Unauthorized access" }));
        return;
      }

      const functionName = req.url.replace(`/${options.rpcPrefix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ error: `Function "${functionName}" not found` })
        );
        return;
      }

      const body = await readBody(req);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      res.statusCode = 200;
      res.end(JSON.stringify({ data: result }));
    },
    onError: (error, _req, res) => {
      console.error("RPC error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  })
};
