"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








var _chunkHEGFZJIOcjs = require('./chunk-HEGFZJIO.cjs');

// src/cache.ts
var ServerCache = class {
  constructor() {
    _chunkHEGFZJIOcjs.__publicField.call(void 0, this, "cache", /* @__PURE__ */ new Map());
  }
  async get(key, ttl = _chunkHEGFZJIOcjs.defaultServerFnOptions.ttl, fetcher) {
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
  const options = { ..._chunkHEGFZJIOcjs.defaultServerFnOptions, ...initialOptions };
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
  _chunkHEGFZJIOcjs.serverFunctionsMap.set(name, {
    name,
    fn: wrappedFunction,
    options
  });
  return wrappedFunction;
}











exports.ServerCache = ServerCache; exports.createServerFunction = createServerFunction; exports.defaultMiddlewareOptions = _chunkHEGFZJIOcjs.defaultMiddlewareOptions; exports.defaultRPCOptions = _chunkHEGFZJIOcjs.defaultRPCOptions; exports.defaultServerFnOptions = _chunkHEGFZJIOcjs.defaultServerFnOptions; exports.functionMappings = _chunkHEGFZJIOcjs.functionMappings; exports.getClientModules = _chunkHEGFZJIOcjs.getClientModules; exports.scanForServerFiles = _chunkHEGFZJIOcjs.scanForServerFiles; exports.serverCache = serverCache; exports.serverFunctionsMap = _chunkHEGFZJIOcjs.serverFunctionsMap;
