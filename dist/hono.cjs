"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunkI745QCC6cjs = require('./chunk-I745QCC6.cjs');

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
    ..._chunkI745QCC6cjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  if (path && rpcPreffix) {
    throw new Error(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration.."
    );
  }
  return async (c, next) => {
    const { path: pathname } = c.req;
    if (_chunkI745QCC6cjs.serverFunctionsMap.size === 0) {
      await _chunkI745QCC6cjs.scanForServerFiles.call(void 0, );
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
    ..._chunkI745QCC6cjs.defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: _chunkI745QCC6cjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (c, next) => {
      const { path } = c.req;
      const { rpcPreffix } = options;
      if (!_optionalChain([path, 'optionalAccess', _3 => _3.startsWith, 'call', _4 => _4(`/${rpcPreffix}/`)])) {
        await next();
        return;
      }
      const functionName = path.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkI745QCC6cjs.serverFunctionsMap.get(functionName);
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



exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
