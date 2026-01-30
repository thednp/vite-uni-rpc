// src/express/createMidleware.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { Connect } from "vite";
// import { scanForServerFiles } from "vite-uni-rpc/server";
import { serverFunctionsMap } from "vite-uni-rpc/server";
// import { serverFunctionsMap, scanForServerFiles } from "../../src/server.ts";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options.ts";
import { getRequestDetails, getResponseDetails, readBody } from "./helpers.ts";
import type {
  ExpressMiddlewareFn,
  ExpressMiddlewareOptions,
} from "./types.d.ts";

// import { JsonArray, JsonValue, ServerFunction } from "../types";
import type { JsonValue, ServerFunction } from "vite-uni-rpc";

let middlewareCount = 0;
const middleWareStack = new Set<string>();

export const createMiddleware: ExpressMiddlewareFn = (initialOptions = {}) => {
  const {
    name: middlewareName,
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError,
  } = Object.assign(
    {},
    defaultMiddlewareOptions,
    initialOptions,
  ) as ExpressMiddlewareOptions;

  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
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
    // if (serverFunctionsMap.size === 0) {
    //   // Let the utility use its own defaults
    //   await scanForServerFiles();
    // }
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
  const options = Object.assign(
    {},
    defaultMiddlewareOptions,
    { rpcPreffix: defaultRPCOptions.rpcPreffix },
    initialOptions,
  ) as ExpressMiddlewareOptions;

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
        sendResponse(404, { error: `Function "${functionName}" not found` });
        return;
      }

      // console.log((req as ExpressRequest).app);

      try {
        const controller = new AbortController();
        req.addListener("close", (e) => {
          console.log("Operation Aborted", e);
          controller.abort("Operation Aborted");
        });
        req.addListener("error", (e) => {
          console.log("Request Error", e);

          // controller.abort("Request Error");
        });
        const body = await readBody(req, controller.signal);

        // const signal = req.headers["signal"] as AbortSignal | undefined;
        const args = Array.isArray(body.data) ? body.data : [body.data];
        const result = await ((serverFunction.fn as unknown as ServerFunction)(
          controller.signal,
          ...args,
        ) as Promise<JsonValue>);

        console.log("express.middleware", result);
        // sendResponse(200, { data: result });
        if (!res.headersSent) {
          sendResponse(200, { data: result });
        }
      } catch (err) {
        // ✅ Detect abort errors
        // if (err instanceof Error && err.message.includes("abort")) {
        //   console.log("✅ Request cancelled by client");
        //   if (!res.headersSent) {
        //     sendResponse(408, { error: "Request cancelled" });
        //   }
        //   return;
        // }
        console.error(String(err));
        sendResponse(500, { error: "Internal Server Error" });
      }
    },
  });
};
