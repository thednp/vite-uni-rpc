"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunkFIWPANLAcjs = require('./chunk-FIWPANLA.cjs');

// src/fastify/createMiddleware.ts
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
    ..._chunkFIWPANLAcjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  if (path && rpcPreffix) {
    throw new Error(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration.."
    );
  }
  return async (req, reply, done) => {
    const [pathname] = req.url.split("?");
    if (_chunkFIWPANLAcjs.serverFunctionsMap.size === 0) {
      await _chunkFIWPANLAcjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      done();
      return;
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(pathname || "")) {
          done();
          return;
        }
      }
      if (rpcPreffix && !_optionalChain([pathname, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          reply.header(key, value);
        });
      }
      if (handler) {
        await handler(req, reply, done);
        if (onResponse) {
          await onResponse(reply);
        }
        return;
      }
      done();
    } catch (error) {
      if (onResponse) {
        await onResponse(reply);
      }
      if (onError) {
        await onError(error, req, reply);
      } else {
        console.error("Middleware error:", String(error));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ..._chunkFIWPANLAcjs.defaultMiddlewareOptions,
    // RPC middleware needs to have the RPC prefix
    rpcPreffix: _chunkFIWPANLAcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, reply, done) => {
      const { url } = req;
      const pathname = _optionalChain([url, 'optionalAccess', _3 => _3.split, 'call', _4 => _4("?"), 'access', _5 => _5[0]]);
      const { rpcPreffix } = options;
      if (!_optionalChain([pathname, 'optionalAccess', _6 => _6.startsWith, 'call', _7 => _7(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      const functionName = pathname.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkFIWPANLAcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" not found`
        });
        return;
      }
      const args = req.body;
      const result = await serverFunction.fn(...args);
      reply.status(200).send({ data: result });
    }
  });
};




exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
