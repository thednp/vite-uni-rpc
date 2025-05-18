"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunk2P4UAVG6cjs = require('./chunk-2P4UAVG6.cjs');

// src/fastify/helpers.ts
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = _optionalChain([req, 'access', _ => _.headers, 'access', _2 => _2["content-type"], 'optionalAccess', _3 => _3.toLowerCase, 'call', _4 => _4()]) || "";
    if (contentType.includes("json")) {
      resolve({
        contentType: "application/json",
        data: req.body
      });
      return;
    }
    let body = "";
    req.raw.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.raw.on("end", () => {
      resolve({ contentType: "text/plain", data: body });
    });
    req.raw.on("error", reject);
  });
};

// src/fastify/createMiddleware.ts
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
  const middlewareHandler = async (req, reply, done) => {
    const reqUrl = new URL(req.url, "http://localhost");
    const url = reqUrl.pathname;
    if (_chunk2P4UAVG6cjs.serverFunctionsMap.size === 0) {
      await _chunk2P4UAVG6cjs.scanForServerFiles.call(void 0, );
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
        if (!matcher.test(url || "")) {
          done();
          return;
        }
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _5 => _5.startsWith, 'call', _6 => _6(`/${rpcPreffix}`)])) {
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
  return createMiddleware({
    ...options,
    handler: async (req, reply, done) => {
      const reqUrl = new URL(req.url, "http://localhost");
      const url = reqUrl.pathname;
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _7 => _7.startsWith, 'call', _8 => _8(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunk2P4UAVG6cjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" was not found`
        });
        return;
      }
      try {
        const body = await readBody(req);
        const [first, ...args] = Array.isArray(body.data) ? [void 0, ...body.data] : [body.data];
        const result = await serverFunction.fn(first, ...args);
        reply.status(200).send({ data: result });
      } catch (err) {
        console.error(String(err));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
};





exports.readBody = readBody; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
