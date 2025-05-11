"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }



var _chunk4DCGKLDMcjs = require('./chunk-4DCGKLDM.cjs');























var _chunkAJLVM5DQcjs = require('./chunk-AJLVM5DQ.cjs');

// src/cache.ts
var ServerCache = class {
  constructor() {
    _chunkAJLVM5DQcjs.__publicField.call(void 0, this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = _chunkAJLVM5DQcjs.defaultServerFnOptions.ttl, fetcher) {
    const entry = this.cache.get(key);
    const now = Date.now();
    if (_optionalChain([entry, 'optionalAccess', _ => _.promise])) return entry.promise;
    if (_optionalChain([entry, 'optionalAccess', _2 => _2.data]) && now - entry.timestamp < ttl) return await entry.data;
    const promise = fetcher().then((data) => {
      this.cache.set(key, { data, timestamp: now });
      return data;
    });
    this.cache.set(key, { ...entry, promise });
    return promise;
  }
  invalidate(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (typeof pattern === "string" && key.includes(pattern)) {
        this.cache.delete(key);
        break;
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        this.cache.delete(key);
        break;
      } else if (pattern instanceof Array) {
        for (const p of pattern) {
          if (typeof p === "string" && key.includes(p)) {
            this.cache.delete(key);
            break;
          } else if (p instanceof RegExp && p.test(key)) {
            this.cache.delete(key);
            break;
          }
        }
      }
    }
  }
};
var serverCache = new ServerCache();

// src/createFn.ts
function createServerFunction(name, fn, initialOptions = {}) {
  const options = { ..._chunkAJLVM5DQcjs.defaultServerFnOptions, ...initialOptions };
  const wrappedFunction = async (...args) => {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const result = await serverCache.get(
      cacheKey,
      options.ttl,
      async () => await fn(...args)
    );
    if (options.invalidateKeys) {
      serverCache.invalidate(options.invalidateKeys);
    }
    return result;
  };
  _chunkAJLVM5DQcjs.serverFunctionsMap.set(name, {
    name,
    fn: wrappedFunction,
    options
  });
  return wrappedFunction;
}

// src/createCors.ts
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var createCors = (initialOptions = {}) => {
  const options = { ..._chunkAJLVM5DQcjs.defaultCorsOptions, ...initialOptions };
  return _cors2.default.call(void 0, options);
};

// src/createCSRF.ts
var _crypto = require('crypto');
var createCSRF = (initialOptions = {}) => {
  const options = { ..._chunkAJLVM5DQcjs.defaultCSRFOptions, ...initialOptions };
  return (req, res, next) => {
    const cookies = _chunk4DCGKLDMcjs.getCookies.call(void 0, req);
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = _crypto.createHash.call(void 0, "sha256").update(Date.now().toString()).digest("hex");
      _chunk4DCGKLDMcjs.setSecureCookie.call(void 0, res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + options.expires * 60 * 60 * 1e3).toUTCString()
      });
    }
    _optionalChain([next, 'optionalCall', _3 => _3()]);
  };
};

// src/createMid.ts
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var createMiddleware = (initialOptions = {}) => {
  const {
    rpcPreffix,
    path,
    headers,
    rateLimit,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ..._chunkAJLVM5DQcjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  const rateLimitStore = rateLimit ? /* @__PURE__ */ new Map() : null;
  return async (req, res, next) => {
    const { url, nodeRequest } = _chunkAJLVM5DQcjs.getRequestDetails.call(void 0, req);
    const { sendResponse: sendResponse2, setHeader } = _chunkAJLVM5DQcjs.getResponseDetails.call(void 0, res);
    if (_chunkAJLVM5DQcjs.serverFunctionsMap.size === 0) {
      await _chunkAJLVM5DQcjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      return _optionalChain([next, 'optionalCall', _4 => _4()]);
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return _optionalChain([next, 'optionalCall', _5 => _5()]);
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _6 => _6.startsWith, 'call', _7 => _7(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _8 => _8()]);
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          setHeader(key, value);
        });
      }
      if (rateLimit && rateLimitStore) {
        const clientIp = nodeRequest.socket.remoteAddress || "unknown";
        const now = Date.now();
        const clientState = rateLimitStore.get(clientIp) || {
          count: 0,
          resetTime: now + (rateLimit.windowMs || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.windowMs)
        };
        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now + (rateLimit.windowMs || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.windowMs);
        }
        if (clientState.count >= (rateLimit.max || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.max)) {
          if (onResponse) {
            await onResponse(res);
          }
          sendResponse2(429, { error: "Too Many Requests" });
          return;
        }
        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }
      if (handler) {
        await handler(req, res, next);
        if (onResponse) {
          await onResponse(res);
        }
        return;
      }
      _optionalChain([next, 'optionalCall', _9 => _9()]);
    } catch (error) {
      if (onResponse) {
        await onResponse(res);
      }
      if (onError) {
        onError(error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        sendResponse2(500, { error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ..._chunkAJLVM5DQcjs.defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: _chunkAJLVM5DQcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url, nodeRequest } = _chunkAJLVM5DQcjs.getRequestDetails.call(void 0, req);
      const { sendResponse: sendResponse2 } = _chunkAJLVM5DQcjs.getResponseDetails.call(void 0, res);
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _10 => _10.startsWith, 'call', _11 => _11(`/${rpcPreffix}/`)])) {
        return _optionalChain([next, 'optionalCall', _12 => _12()]);
      }
      const csrfToken = _chunk4DCGKLDMcjs.getCookie.call(void 0, req, "X-CSRF-Token");
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse2(403, { error: "Unauthorized" });
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkAJLVM5DQcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse2(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      const body = await _chunkAJLVM5DQcjs.readBody.call(void 0, nodeRequest);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      sendResponse2(200, { data: result });
    },
    onError: (error, _req, res) => {
      const { sendResponse: sendResponse2 } = _chunkAJLVM5DQcjs.getResponseDetails.call(void 0, res);
      console.error("RPC error:", error);
      sendResponse2(500, { error: "Internal Server Error" });
    }
  });
};

// src/session.ts

var SessionManager = class {
  constructor() {
    _chunkAJLVM5DQcjs.__publicField.call(void 0, this, "sessions", /* @__PURE__ */ new Map());
  }
  createSession(userId, duration = 24 * 60 * 60 * 1e3) {
    const session = {
      id: _crypto.randomBytes.call(void 0, 32).toString("hex"),
      userId,
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + duration),
      data: {}
    };
    this.sessions.set(session.id, session);
    return session;
  }
  getSession(id) {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt < /* @__PURE__ */ new Date()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }
  // Add more session management methods as needed
};
var currentSession;
var useSession = () => {
  if (!currentSession) {
    currentSession = new SessionManager();
  }
  return currentSession;
};


























exports.createCSRF = createCSRF; exports.createCors = createCors; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.createServerFunction = createServerFunction; exports.functionMappings = _chunkAJLVM5DQcjs.functionMappings; exports.getClientModules = _chunkAJLVM5DQcjs.getClientModules; exports.getCookie = _chunk4DCGKLDMcjs.getCookie; exports.getCookies = _chunk4DCGKLDMcjs.getCookies; exports.getRequestDetails = _chunkAJLVM5DQcjs.getRequestDetails; exports.getResponseDetails = _chunkAJLVM5DQcjs.getResponseDetails; exports.isExpressRequest = _chunkAJLVM5DQcjs.isExpressRequest; exports.isExpressResponse = _chunkAJLVM5DQcjs.isExpressResponse; exports.isHonoRequest = _chunkAJLVM5DQcjs.isHonoRequest; exports.isHonoResponse = _chunkAJLVM5DQcjs.isHonoResponse; exports.isKoaRequest = _chunkAJLVM5DQcjs.isKoaRequest; exports.isKoaResponse = _chunkAJLVM5DQcjs.isKoaResponse; exports.isNodeRequest = _chunkAJLVM5DQcjs.isNodeRequest; exports.isNodeResponse = _chunkAJLVM5DQcjs.isNodeResponse; exports.readBody = _chunkAJLVM5DQcjs.readBody; exports.scanForServerFiles = _chunkAJLVM5DQcjs.scanForServerFiles; exports.sendResponse = _chunkAJLVM5DQcjs.sendResponse; exports.serverFunctionsMap = _chunkAJLVM5DQcjs.serverFunctionsMap; exports.setSecureCookie = _chunk4DCGKLDMcjs.setSecureCookie; exports.useSession = useSession;
