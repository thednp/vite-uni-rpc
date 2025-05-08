// src/createMid.ts
import process from "node:process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Buffer } from "node:buffer"
import type { Connect } from "vite";
import { isExpressRequest, readBody } from "./utils";
import { getCookies } from "./cookie";
import { serverFunctionsMap } from "./registry";
import type { MiddlewareOptions } from "./types";
import { defaultRPCOptions } from "./options";
import { Request, Response } from "express";

type TransformFn = (chunk: unknown, req: IncomingMessage, res: ServerResponse<IncomingMessage>) => unknown;

const middlewareDefaults: MiddlewareOptions & { transform?: TransformFn } = {
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
    req: IncomingMessage | Request,
    res: ServerResponse | Response,
    next: Connect.NextFunction,
  ) => {
    const url = isExpressRequest(req) ? req.originalUrl : req.url;

    try {
      // Path matching
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return next();
      }
      // rpcPrefix matching
      if (rpcPrefix && !url?.startsWith(rpcPrefix)) return next();

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
      res.end = function(
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
  return async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
    next: Connect.NextFunction
  ) => {
    const options = { ...defaultRPCOptions, ...initialOptions };
    const url = isExpressRequest(req) ? req.originalUrl : req.url;
    
    try {
      if (!url?.startsWith(`/${options.rpcPrefix}/`)) return next();

      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];

      if (!csrfToken) {
        if (process.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware")
        }
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Unauthorized access" }));
        return;
      }

      const functionName = url?.replace(`/${options.rpcPrefix}/`, "");
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
    } catch (error) {
      console.error("RPC error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  };
};
