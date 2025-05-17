"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunk4GHZIEGXcjs = require('./chunk-4GHZIEGX.cjs');

// src/hono/createMiddleware.ts
var _factory = require('hono/factory');
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
    ..._chunk4GHZIEGXcjs.defaultMiddlewareOptions,
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
  const middlewareHandler = _factory.createMiddleware.call(void 0, 
    async (c, next) => {
      const { path: pathname } = c.req;
      if (_chunk4GHZIEGXcjs.serverFunctionsMap.size === 0) {
        await _chunk4GHZIEGXcjs.scanForServerFiles.call(void 0, );
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
        if (rpcPreffix && !_optionalChain([pathname, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2(`/${rpcPreffix}`)])) {
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
    ..._chunk4GHZIEGXcjs.defaultMiddlewareOptions,
    rpcPreffix: _chunk4GHZIEGXcjs.defaultRPCOptions.rpcPreffix,
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
      const serverFunction = _chunk4GHZIEGXcjs.serverFunctionsMap.get(functionName);
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




exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.viteMiddleware = viteMiddleware;
