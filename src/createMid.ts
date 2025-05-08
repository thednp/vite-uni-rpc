// src/createMid.ts
import process from "node:process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";
import { readBody } from "./utils";
import { getCookies } from "./cookie";
import { serverFunctionsMap } from "./registry";
import { MiddlewareOptions } from "./types";
import { defaultOptions } from "./options";

const middlewareDefaults: MiddlewareOptions = {
  rpcPrefix: undefined,
  path: undefined,
  headers: {},
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1000, // 5m
  },
  transform: undefined,
  onError: undefined,
};

export const createMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {},
) => {
  const { rpcPrefix, path, headers, rateLimit, transform, onError } = {
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
        if (!matcher.test(req.url || "")) return next();
      }
      // rpcPrefix matching
      if (rpcPrefix && !req.url?.startsWith(rpcPrefix)) return next();

      // Set custom headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
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

      // Store original end to intercept response
      const originalEnd = res.end.bind(res);
      res.end = function (
        chunk?: string | Buffer | Uint8Array | (() => void),
        encoding?: BufferEncoding | (() => void),
        callback?: () => void,
      ) {
        try {
          // Transform response if configured
          if (transform && chunk && typeof chunk !== "function") {
            const data = typeof chunk === "string" ? JSON.parse(chunk) : chunk;
            chunk = JSON.stringify(transform(data, req, res));
          }
        } catch (error) {
          console.error("Response handling error:", String(error));
        }

        // Handle overloads
        if (
          chunk &&
          (typeof chunk === "function" ||
            encoding === undefined && callback === undefined)
        ) {
          return originalEnd(chunk);
        }
        if (chunk && typeof encoding === "function") {
          return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding as BufferEncoding, callback);
      };

      next();
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

export const createRPCMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {}, 
) => {
  return async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
    next: Connect.NextFunction
  ) => {
    const options = { ...defaultOptions, ...initialOptions };
    try {
      if (!req.url?.startsWith(`/${options.rpcPrefix}/`)) return next();

      const cookies = getCookies(req.headers.cookie);
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
      res.end(JSON.stringify({ data: result }));
    } catch (error) {
      console.error("RPC error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  };
};