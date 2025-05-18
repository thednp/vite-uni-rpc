"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunk2P4UAVG6cjs = require('./chunk-2P4UAVG6.cjs');

// src/hono/createMiddleware.ts
var _factory = require('hono/factory');

// src/hono/helpers.ts

var viteMiddleware = (vite) => {
  return _factory.createMiddleware.call(void 0, (c, next) => {
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
  const contentType = _optionalChain([c, 'access', _ => _.req, 'access', _2 => _2.header, 'call', _3 => _3("content-type"), 'optionalAccess', _4 => _4.toLowerCase, 'call', _5 => _5()]) || "";
  if (contentType.includes("json")) {
    const data = await c.req.json();
    return {
      contentType: "application/json",
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
    ..._chunk2P4UAVG6cjs.defaultMiddlewareOptions,
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
  const middlewareHandler = _factory.createMiddleware.call(void 0, 
    async (c, next) => {
      const reqUrl = new URL(c.req.path, "http://localhost");
      const url = reqUrl.pathname;
      if (_chunk2P4UAVG6cjs.serverFunctionsMap.size === 0) {
        await _chunk2P4UAVG6cjs.scanForServerFiles.call(void 0, );
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
        if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _6 => _6.startsWith, 'call', _7 => _7(`/${rpcPreffix}`)])) {
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
    ..._chunk2P4UAVG6cjs.defaultMiddlewareOptions,
    rpcPreffix: _chunk2P4UAVG6cjs.defaultRPCOptions.rpcPreffix,
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
      const serverFunction = _chunk2P4UAVG6cjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        return c.json({ error: `Function "${functionName}" not found` }, 404);
      }
      try {
        const body = await readBody(c);
        const [first, ...args] = Array.isArray(body.data) ? [void 0, ...body.data] : [body.data];
        const result = await serverFunction.fn(first, ...args);
        return c.json({ data: result }, 200);
      } catch (err) {
        console.error(String(err));
        return c.json({ error: "Internal Server Error" }, 500);
      }
    }
  });
};





exports.createMiddleware = createMiddleware2; exports.createRPCMiddleware = createRPCMiddleware; exports.readBody = readBody; exports.viteMiddleware = viteMiddleware;
