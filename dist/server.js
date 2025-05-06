var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/cache.ts
var ServerCache = class {
  constructor() {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl, fetcher) {
    const entry = this.cache.get(key);
    const now = Date.now();
    if (entry?.promise) return entry.promise;
    if (entry && now - entry.timestamp < ttl) return entry.data;
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
var serverFunctionsMap = /* @__PURE__ */ new Map();
function registerServerFunction(name, fn, options) {
  serverFunctionsMap.set(name, { name, fn, options });
}
function createServerFunction(name, fn, options = {}) {
  const wrappedFunction = async (...args) => {
    if (!options.cache?.ttl) return fn(...args);
    const cacheKey = `${name}-${JSON.stringify(args)}`;
    const result = await serverCache.get(
      cacheKey,
      options.cache.ttl,
      () => fn(...args)
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
  registerServerFunction,
  serverFunctionsMap
};
