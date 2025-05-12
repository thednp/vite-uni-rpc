import {
  defaultMiddlewareOptions,
  defaultRPCOptions,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-LQUDPDUK.js";

// src/hono/createMiddleware.ts
var createMiddleware = (initialOptions = {}) => {
  const {
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
  return async (c, next) => {
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
          c.res.headers.set(key, value);
        });
      }
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
        await onError(error, c);
      } else {
        console.error("Middleware error:", String(error));
        c.json({ error: "Internal Server Error" }, 500);
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ...defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (c, next) => {
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
      const args = await c.req.json();
      const result = await serverFunction.fn(...args);
      c.json({ data: result }, 200);
    }
  });
};
export {
  createMiddleware,
  createRPCMiddleware
};
