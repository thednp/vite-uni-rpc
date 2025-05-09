"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


















var _chunkB5FCQLONcjs = require('./chunk-B5FCQLON.cjs');

// src/cache.ts
var ServerCache = class {
  constructor() {
    _chunkB5FCQLONcjs.__publicField.call(void 0, this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = _chunkB5FCQLONcjs.defaultServerFnOptions.ttl, fetcher) {
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
  const options = { ..._chunkB5FCQLONcjs.defaultServerFnOptions, ...initialOptions };
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
  _chunkB5FCQLONcjs.serverFunctionsMap.set(name, {
    name,
    fn: wrappedFunction,
    options
  });
  return wrappedFunction;
}

// src/session.ts
var _crypto = require('crypto');
var SessionManager = class {
  constructor() {
    _chunkB5FCQLONcjs.__publicField.call(void 0, this, "sessions", /* @__PURE__ */ new Map());
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



















exports.createCSRF = _chunkB5FCQLONcjs.createCSRF; exports.createCors = _chunkB5FCQLONcjs.createCors; exports.createMiddleware = _chunkB5FCQLONcjs.createMiddleware; exports.createRPCMiddleware = _chunkB5FCQLONcjs.createRPCMiddleware; exports.createServerFunction = createServerFunction; exports.defineRPCConfig = _chunkB5FCQLONcjs.defineRPCConfig; exports.functionMappings = _chunkB5FCQLONcjs.functionMappings; exports.getClientModules = _chunkB5FCQLONcjs.getClientModules; exports.getCookies = _chunkB5FCQLONcjs.getCookies; exports.isExpressRequest = _chunkB5FCQLONcjs.isExpressRequest; exports.isExpressResponse = _chunkB5FCQLONcjs.isExpressResponse; exports.loadRPCConfig = _chunkB5FCQLONcjs.loadRPCConfig; exports.readBody = _chunkB5FCQLONcjs.readBody; exports.scanForServerFiles = _chunkB5FCQLONcjs.scanForServerFiles; exports.sendResponse = _chunkB5FCQLONcjs.sendResponse; exports.serverFunctionsMap = _chunkB5FCQLONcjs.serverFunctionsMap; exports.setSecureCookie = _chunkB5FCQLONcjs.setSecureCookie; exports.useSession = useSession;
