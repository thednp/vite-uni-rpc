import {
  __publicField,
  serverFunctionsMap
} from "./chunk-S62OQ7GK.js";

// src/cache.ts
var DEFAULT_TTL = 5e3;
var ServerCache = class {
  constructor() {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = DEFAULT_TTL, fetcher) {
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

// src/server.ts
function registerServerFunction(name, fn, options = {}) {
  serverFunctionsMap.set(name, { name, fn, options });
}
function createServerFunction(name, fn, options = {}) {
  const wrappedFunction = async (...args) => {
    if (!options.cache?.ttl) return fn(...args);
    const cacheKey = `${name}-${JSON.stringify(args)}`;
    const result = await serverCache.get(
      cacheKey,
      options.cache.ttl,
      async () => await fn(...args)
    );
    if (options.cache.invalidateKeys) {
      serverCache.invalidate(options.cache.invalidateKeys);
    }
    return result;
  };
  registerServerFunction(name, wrappedFunction, options);
  return wrappedFunction;
}
export {
  createServerFunction,
  registerServerFunction
};
