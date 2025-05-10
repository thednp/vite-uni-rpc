// src/createMid.ts
import process from "node:process";
// import type { IncomingMessage, ServerResponse } from "node:http";
// import type { Request, Response } from "express";
import type { Connect } from "vite";
import {
  getRequestDetails,
  getResponseDetails,
  // isExpressRequest,
  // isExpressResponse,
  readBody,
  scanForServerFiles,
  // sendResponse,
} from "./utils";
import { getCookies } from "./cookie";
import { serverFunctionsMap } from "./utils";
import type {
  AnyRequest,
  AnyResponse,
  JsonValue,
  MiddlewareOptions,
} from "./types";
import { defaultMiddlewareOptions, defaultRPCOptions } from "./options";

export const createMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {},
) => {
  const {
    rpcPreffix,
    path,
    headers,
    rateLimit,
    handler,
    onRequest,
    onResponse,
    onError,
  } = {
    ...defaultMiddlewareOptions,
    ...initialOptions,
  };

  // Rate limiting state if enabled
  const rateLimitStore = rateLimit
    ? new Map<string, { count: number; resetTime: number }>()
    : null;

  return async (
    req: AnyRequest,
    res: AnyResponse,
    next: Connect.NextFunction,
  ) => {
    const { url, nodeRequest } = getRequestDetails(req);
    const { sendResponse, setHeader } = getResponseDetails(res);
    // const url = isExpressRequest(req) ? req.originalUrl : req.url;
    // When serving from production server, it's a good idea to
    // scan for server files and populate the serverFunctionsMap
    if (serverFunctionsMap.size === 0) {
      // Let the utility use its own defaults
      await scanForServerFiles();
    }
    // No need to continue when no handler provided
    if (!handler) {
      return next?.();
    }

    try {
      // Execute onRequest hook if provided
      if (onRequest) {
        await onRequest(req);
      }
      // Path matching
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return next?.();
      }
      // rpcPreffix matching
      if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
        return next?.();
      }

      // Set custom headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          setHeader(key, value);
        });
      }

      // Rate limiting check
      if (rateLimit && rateLimitStore) {
        const clientIp = nodeRequest.socket.remoteAddress || "unknown";
        const now = Date.now();
        const clientState = rateLimitStore.get(clientIp) || {
          count: 0,
          resetTime: now +
            (rateLimit.windowMs || defaultRPCOptions.rateLimit.windowMs),
        };

        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now +
            (rateLimit.windowMs || defaultRPCOptions.rateLimit.windowMs);
        }

        if (
          clientState.count >=
            (rateLimit.max || defaultRPCOptions.rateLimit.max)
        ) {
          if (onResponse) {
            await onResponse(res);
          }
          sendResponse(429, { error: "Too Many Requests" });
          return;
        }

        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }

      // Execute handler if provided
      if (handler) {
        await handler(req, res, next);
        if (onResponse) {
          await onResponse(res);
        }
        return;
      }

      next?.();
    } catch (error) {
      if (onResponse) {
        await onResponse(res);
      }
      if (onError) {
        onError(error as Error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        sendResponse(500, { error: "Internal Server Error" });
      }
    }
  };
};

// Create RPC middleware
export const createRPCMiddleware = (
  initialOptions: Partial<MiddlewareOptions> = {},
) => {
  const options = {
    // rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...defaultMiddlewareOptions,
    ...initialOptions,
  };

  return createMiddleware({
    ...options,
    handler: async (
      req: AnyRequest,
      res: AnyResponse,
      next: Connect.NextFunction,
    ) => {
      // const url = isExpressRequest(req) ? req.originalUrl : req.url;
      const { url, nodeRequest } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;

      if (!url?.startsWith(`/${rpcPreffix}/`)) {
        return next?.();
      }

      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];

      if (!csrfToken) {
        if (process.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }

        sendResponse(403, { error: "Unauthorized access" });
        return;
      }

      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        sendResponse(
          404,
          { error: `Function "${functionName}" not found` },
        );
        return;
      }

      const body = await readBody(nodeRequest);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args) as JsonValue;
      sendResponse(200, { data: result });
    },
    onError: (error, _req, res) => {
      const { sendResponse } = getResponseDetails(res);
      console.error("RPC error:", error);
      sendResponse(500, { error: "Internal Server Error" });
    },
  });
};
