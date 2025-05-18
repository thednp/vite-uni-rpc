import {
  defaultMiddlewareOptions,
  defaultRPCOptions,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-EUSB4D3V.js";

// src/hono/createMiddleware.ts
import { createMiddleware as createHonoMiddleware } from "hono/factory";

// src/hono/helpers.ts
import { Buffer } from "buffer";
import { createMiddleware } from "hono/factory";
import formidable from "formidable";
var viteMiddleware = (vite) => {
  return createMiddleware((c, next) => {
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
var readBody = async (c) => {
  const contentType = c.req.header("content-type")?.toLowerCase() || "";
  if (contentType.includes("multipart/form-data")) {
    const form = formidable({ multiples: true });
    return new Promise((resolve, reject) => {
      form.parse(c.env.incoming, (err, fields, files) => {
        if (err) return reject(err);
        resolve({
          contentType: "multipart/form-data",
          fields,
          files
        });
      });
    });
  }
  if (contentType.includes("octet-stream")) {
    const buffer = await c.req.arrayBuffer();
    return {
      contentType: "application/octet-stream",
      data: Buffer.from(buffer)
    };
  }
  if (contentType.includes("json")) {
    const data = await c.req.json();
    return {
      contentType: "application/json",
      data
    };
  }
  if (contentType.includes("urlencoded")) {
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData);
    return {
      contentType: "application/x-www-form-urlencoded",
      data
    };
  }
  const text = await c.req.text();
  return { contentType: "text/plain", data: text };
};

// src/hono/createMiddleware.ts
var middlewareCount = 0;
var middleWareStack = /* @__PURE__ */ new Set();
var createMiddleware2 = (initialOptions = {}) => {
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
  return createMiddleware2({
    ...options,
    handler: async (c, next) => {
      const { path } = c.req;
      const { rpcPreffix } = options;
      if (!rpcPreffix || !path.startsWith(`/${rpcPreffix}`)) {
        await next();
        return;
      }
      const functionName = path.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        return c.json({ error: `Function "${functionName}" not found` }, 404);
      }
      try {
        const body = await readBody(c);
        let args;
        switch (body.contentType) {
          case "application/json":
            args = body.data;
            break;
          case "multipart/form-data":
            args = [body.fields, body.files];
            break;
          case "application/x-www-form-urlencoded":
            args = [body.data];
            break;
          case "application/octet-stream":
            args = [body.data];
            break;
          default:
            args = [body.data];
        }
        const result = await serverFunction.fn(...args);
        return c.json({ data: result }, 200);
      } catch (err) {
        console.error(String(err));
        return c.json({ error: "Internal Server Error" }, 500);
      }
    }
  });
};
export {
  createMiddleware2 as createMiddleware,
  createRPCMiddleware,
  readBody,
  viteMiddleware
};
