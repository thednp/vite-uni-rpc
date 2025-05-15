// src/express/createMidleware.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { Connect } from "vite";
import { scanForServerFiles } from "../utils";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options";
import { getRequestDetails, getResponseDetails, readBody } from "./helpers";
import { serverFunctionsMap } from "../utils";
import type { Arguments, JsonValue } from "../types";
import { type ExpressMiddlewareFn } from "./types";

let middlewareCount = 0;
const middleWareStack = new Set<string>();

export const createMiddleware: ExpressMiddlewareFn = (
  initialOptions = {},
) => {
  const {
    name: middlewareName,
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError,
  } = {
    ...defaultMiddlewareOptions,
    ...initialOptions,
  };

  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }

  // Check for configuration conflict
  if (path && rpcPreffix) {
    throw new Error(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. " +
        "The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. " +
        "Skipping middleware registration..",
    );
  }

  const middlewareHandler = async (
    req: IncomingMessage | ExpressRequest,
    res: ServerResponse | ExpressResponse,
    next: Connect.NextFunction | NextFunction,
  ) => {
    const { url } = getRequestDetails(req);
    const { sendResponse, setHeader } = getResponseDetails(res);
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

  Object.defineProperty(middlewareHandler, "name", {
    value: name,
  });

  return middlewareHandler;
};

// Create RPC middleware
export const createRPCMiddleware: ExpressMiddlewareFn = (
  initialOptions = {},
) => {
  const options = {
    ...defaultMiddlewareOptions,
    // RPC middleware needs to have the RPC preffix
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions,
  };

  return createMiddleware({
    ...options,
    handler: async (
      req: IncomingMessage | ExpressRequest,
      res: ServerResponse | ExpressResponse,
      next: NextFunction | Connect.NextFunction,
    ) => {
      const { url } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;

      if (!url?.startsWith(`/${rpcPreffix}`)) {
        return next?.();
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

      const body = await readBody(req);
      const args = JSON.parse(body || "[]") as Arguments[];
      const result = await serverFunction.fn(...args) as JsonValue;
      sendResponse(200, { data: result });
    },
  });
};
