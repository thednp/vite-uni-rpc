// src/hono/createMiddleware.ts
import type { Context, Next } from "hono";
import { createMiddleware as createHonoMiddleware } from "hono/factory";
// import { scanForServerFiles } from "vite-uni-rpc/server";
import { serverFunctionsMap, scanForServerFiles } from "vite-uni-rpc/server";
import type { ServerFunction } from "vite-uni-rpc";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options.ts";
import type { HonoMiddlewareFn, HonoMiddlewareOptions } from "./types.d.ts";
import { readBody } from "./helpers.ts";

let middlewareCount = 0;
const middleWareStack = new Set<string>();

export const createMiddleware: HonoMiddlewareFn = (initialOptions = {}) => {
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
  ) as HonoMiddlewareOptions;

  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }

  const middlewareHandler = createHonoMiddleware(
    async (c: Context, next: Next) => {
      const reqUrl = new URL(c.req.path, "http://localhost");
      const url = reqUrl.pathname;

      if (serverFunctionsMap.size === 0) {
        await scanForServerFiles();
      }

      if (!handler) {
        await next();
        return;
      }

      try {
        if (onRequest) {
          await onRequest(c);
        }

        if (path) {
          const matcher = typeof path === "string" ? new RegExp(path) : path;
          if (!matcher.test(url || "")) {
            await next();
            return;
          }
        }

        if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
          await next();
          return;
        }

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            c.header(key, value);
          });
        }

        if (handler) {
          const result = await handler(c, next);

          if (onResponse) {
            await onResponse(c);
          }

          return result;
        }
        await next();
      } catch (error) {
        if (onResponse) {
          await onResponse(c);
        }
        if (onError) {
          await onError(error as Error, c);
        } else {
          return c.json({ error: "Internal Server Error" }, 500);
        }
      }
    },
  );

  Object.defineProperty(middlewareHandler, "name", {
    value: name,
  });

  return middlewareHandler;
};

export const createRPCMiddleware: HonoMiddlewareFn = (initialOptions = {}) => {
  const options = Object.assign(
    {},
    defaultMiddlewareOptions,
    { rpcPreffix: defaultRPCOptions.rpcPreffix },
    initialOptions,
  ) as HonoMiddlewareOptions;

  return createMiddleware({
    ...options,
    handler: async (c: Context, next: Next) => {
      const { path } = c.req;
      const { rpcPreffix } = options;

      if (!rpcPreffix || !path.startsWith(`/${rpcPreffix}`)) {
        return await next();
        // return;
        // return c.json({ error: `Invalid configuration` }, 404);
      }

      const functionName = path.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        return c.json({ error: `Function "${functionName}" not found` }, 404);
      }

      try {
        const body = await readBody(c);
        const controller = new AbortController();
        c.req.raw.signal.addEventListener("abort", () => {
          controller.abort();
        });
        const args = Array.isArray(body.data) ? body.data : [body.data];
        const result = await (serverFunction.fn as unknown as ServerFunction)(
          controller.signal,
          ...args,
        );
        // TO DO: HANDLE cancel + Abort signal

        return c.json({ data: result }, 200);
      } catch (err) {
        console.error(String(err));
        return c.json({ error: "Internal Server Error" }, 500);
      }
    },
  });
};
