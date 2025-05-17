import {
  defaultMiddlewareOptions,
  defaultRPCOptions,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-GSKE4CT4.js";

// src/hono/createMiddleware.ts
import { createMiddleware as createHonoMiddleware } from "hono/factory";
var middlewareCount = 0;
var middleWareStack = /* @__PURE__ */ new Set();
var createMiddleware = (initialOptions = {}) => {
  const {
    name: middlewareName,
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ...defaultMiddlewareOptions,
    ...initialOptions
  };
  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }
  if (path && rpcPreffix) {
    throw new Error(
      'Configuration conflict: Both "path" and "rpcPreffix" are provided. The middleware expects either "path" for general middleware or "rpcPreffix" for RPC middleware, but not both. Skipping middleware registration..'
    );
  }
  const middlewareHandler = createHonoMiddleware(
    async (c, next) => {
      const { path: pathname } = c.req;
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
          if (!matcher.test(pathname || "")) {
            await next();
            return;
          }
        }
        if (rpcPreffix && !pathname?.startsWith(`/${rpcPreffix}`)) {
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
          await onError(error, c);
        } else {
          return c.json({ error: "Internal Server Error" }, 500);
        }
      }
    }
  );
  Object.defineProperty(middlewareHandler, "name", {
    value: name
  });
  return middlewareHandler;
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ...defaultMiddlewareOptions,
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (c, next) => {
      const { path } = c.req;
      const { rpcPreffix } = options;
      if (!rpcPreffix || rpcPreffix.length === 0) {
        await next();
        return;
      }
      if (rpcPreffix && !path.startsWith(`/${rpcPreffix}`)) {
        await next();
        return;
      }
      const functionName = path.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        return c.json({ error: `Function "${functionName}" not found` }, 404);
      }
      try {
        const body = await c.req.text();
        const args = body ? JSON.parse(body) : [];
        const result = await serverFunction.fn(...args);
        return c.json({ data: result }, 200);
      } catch (err) {
        console.error(String(err));
        return c.json({ error: "Internal Server Error" }, 500);
      }
    }
  });
};

// src/hono/helpers.ts
import { createMiddleware as createMiddleware2 } from "hono/factory";
var viteMiddleware = (vite) => {
  return createMiddleware2((c, next) => {
    return new Promise((resolve) => {
      if (typeof Bun === "undefined") {
        vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve(next()));
        return;
      }
      let sent = false;
      const headers = new Headers();
      vite.middlewares(
        {
          url: new URL(c.req.path, "http://localhost").pathname,
          method: c.req.raw.method,
          headers: Object.fromEntries(
            c.req.raw.headers
          )
        },
        {
          setHeader(name, value) {
            headers.set(name, value);
            return this;
          },
          end(body) {
            sent = true;
            resolve(
              // @ts-expect-error - weird
              c.body(body, c.res.status, headers)
            );
          }
        },
        () => sent || resolve(next())
      );
    });
  });
};
export {
  createMiddleware,
  createRPCMiddleware,
  viteMiddleware
};
