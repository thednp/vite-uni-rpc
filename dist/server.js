import {
  __publicField,
  corsMiddleware,
  createCSRF,
  createCors,
  createMiddleware,
  createRPCMiddleware,
  csrfMiddleware,
  defaultRPCOptions,
  getCookies,
  rpcMiddleware,
  serverFunctionsMap,
  setSecureCookie
} from "./chunk-4AYKOHDY.js";

// src/cache.ts
var ServerCache = class {
  constructor() {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = defaultRPCOptions.ttl, fetcher) {
    const entry = this.cache.get(key);
    const now = Date.now();
    if (entry?.promise) return entry.promise;
    if (entry?.data && now - entry.timestamp < ttl) return await entry.data;
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
  const options = { ttl: defaultRPCOptions.ttl, ...initialOptions };
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
  serverFunctionsMap.set(name, {
    name,
    fn: wrappedFunction,
    options
  });
  return wrappedFunction;
}

// src/session.ts
import { randomBytes } from "node:crypto";
var SessionManager = class {
  constructor() {
    __publicField(this, "sessions", /* @__PURE__ */ new Map());
  }
  createSession(userId, duration = 24 * 60 * 60 * 1e3) {
    const session = {
      id: randomBytes(32).toString("hex"),
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
export {
  corsMiddleware,
  createCSRF,
  createCors,
  createMiddleware,
  createRPCMiddleware,
  createServerFunction,
  csrfMiddleware,
  getCookies,
  rpcMiddleware,
  setSecureCookie,
  useSession
};
