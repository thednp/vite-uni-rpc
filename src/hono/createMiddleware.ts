// src/hono/createMiddleware.ts
import type { Context, Next } from "hono";
import { scanForServerFiles, serverFunctionsMap } from "../utils";
import type { Arguments, JsonValue } from "../types";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options";
import { type HonoMiddlewareFn } from "./types";

export const createMiddleware: HonoMiddlewareFn = (
  initialOptions = {},
) => {
  const {
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

  if (path && rpcPreffix) {
    throw new Error(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. " +
        "The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. " +
        "Skipping middleware registration..",
    );
  }

  return async (
    c: Context,
    next: Next,
  ) => {
    const { path: pathname } = c.req;
    // When serving from production server, it's a good idea to
    // scan for server files and populate the serverFunctionsMap
    if (serverFunctionsMap.size === 0) {
      // Let the utility use its own defaults
      await scanForServerFiles();
    }
    // No need to continue when no handler provided
    if (!handler) {
      await next();
      return;
    }

    try {
      // Execute onRequest hook if provided
      if (onRequest) {
        await onRequest(c);
      }
      // Path matching
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(pathname || "")) {
          await next();
          return;
        }
      }
      // rpcPreffix matching
      if (rpcPreffix && !pathname?.startsWith(`/${rpcPreffix}`)) {
        await next();
        return;
      }

      // Set custom headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          c.res.headers.set(key, value);
        });
      }

      // Execute handler if provided
      if (handler) {
        await handler(c, next);
        if (onResponse) {
          await onResponse(c);
        }
        return;
      }

      next();
    } catch (error) {
      if (onResponse) {
        await onResponse(c);
      }
      if (onError) {
        await onError(error as Error, c);
      } else {
        console.error("Middleware error:", String(error));
        c.json({ error: "Internal Server Error" }, 500);
      }
    }
  };
};

// Create RPC middleware
export const createRPCMiddleware: HonoMiddlewareFn = (
  initialOptions = {},
) => {
  const options = {
    ...defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions,
  };

  return createMiddleware({
    ...options,
    handler: async (
      c: Context,
      next: Next,
    ) => {
      const { path } = c.req;
      const { rpcPreffix } = options;

      if (!path?.startsWith(`/${rpcPreffix}/`)) {
        await next();
        return;
      }

      const functionName = path.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        c.json({ error: `Function "${functionName}" not found` }, 404);
        return;
      }

      // const body = await readBody(c.req.raw as Request);
      // const body = await c.req.json() as string;
      // const args = JSON.parse(body || "[]") as Arguments[];
      const args = await c.req.json() as Arguments[];
      const result = await serverFunction.fn(...args) as JsonValue;
      c.json({ data: result }, 200);
    },
  });
};
