"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


















var _chunkJB7TUQRXcjs = require('./chunk-JB7TUQRX.cjs');

// src/cache.ts
var ServerCache = class {
  constructor() {
    _chunkJB7TUQRXcjs.__publicField.call(void 0, this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = _chunkJB7TUQRXcjs.defaultServerFnOptions.ttl, fetcher) {
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
  const options = { ..._chunkJB7TUQRXcjs.defaultServerFnOptions, ...initialOptions };
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
  _chunkJB7TUQRXcjs.serverFunctionsMap.set(name, {
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
    _chunkJB7TUQRXcjs.__publicField.call(void 0, this, "sessions", /* @__PURE__ */ new Map());
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



















exports.createCSRF = _chunkJB7TUQRXcjs.createCSRF; exports.createCors = _chunkJB7TUQRXcjs.createCors; exports.createMiddleware = _chunkJB7TUQRXcjs.createMiddleware; exports.createRPCMiddleware = _chunkJB7TUQRXcjs.createRPCMiddleware; exports.createServerFunction = createServerFunction; exports.defineRPCConfig = _chunkJB7TUQRXcjs.defineRPCConfig; exports.functionMappings = _chunkJB7TUQRXcjs.functionMappings; exports.getClientModules = _chunkJB7TUQRXcjs.getClientModules; exports.getCookies = _chunkJB7TUQRXcjs.getCookies; exports.isExpressRequest = _chunkJB7TUQRXcjs.isExpressRequest; exports.isExpressResponse = _chunkJB7TUQRXcjs.isExpressResponse; exports.loadRPCConfig = _chunkJB7TUQRXcjs.loadRPCConfig; exports.readBody = _chunkJB7TUQRXcjs.readBody; exports.scanForServerFiles = _chunkJB7TUQRXcjs.scanForServerFiles; exports.sendResponse = _chunkJB7TUQRXcjs.sendResponse; exports.serverFunctionsMap = _chunkJB7TUQRXcjs.serverFunctionsMap; exports.setSecureCookie = _chunkJB7TUQRXcjs.setSecureCookie; exports.useSession = useSession;
