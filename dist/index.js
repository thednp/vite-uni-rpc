var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/index.ts
import { createHash } from "node:crypto";

// src/utils.ts
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
}

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

// src/index.ts
function trpcPlugin() {
  let isSSR = false;
  const VIRTUAL_MODULE_PREFIX = "virtual:@rpc/";
  const RESOLVED_VIRTUAL_MODULE_PREFIX = "\0" + VIRTUAL_MODULE_PREFIX;
  return {
    name: "vite-plugin-rpc",
    config(config) {
      isSSR = !!config.build?.ssr;
    },
    resolveId(id) {
      if (id.startsWith(VIRTUAL_MODULE_PREFIX)) {
        return "\0" + id;
      }
      return null;
    },
    load(id) {
      if (id.startsWith(RESOLVED_VIRTUAL_MODULE_PREFIX)) {
        const fnName = id.slice(RESOLVED_VIRTUAL_MODULE_PREFIX.length);
        return `
          export default async function ${fnName}(...args) {
            const response = await fetch('/__rpc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: '${fnName}', args })
            });
            if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            return result.data;
          }
        `;
      }
      return null;
    },
    transform(code, id, { ssr }) {
      if (!code.includes("createServerFunction")) {
        return null;
      }
      if (ssr) {
        const functionMatches = code.matchAll(/createServerFunction\(['"]([\w-]+)['"],\s*async?\s*\((.*?)\)\s*=>\s*{/g);
        for (const match of functionMatches) {
          const [_, fnName] = match;
          serverFunctionsMap.set(fnName, code);
        }
        return {
          code,
          map: null
        };
      } else {
        return {
          code: code.replace(
            /export const (\w+)\s*=\s*createServerFunction\(['"]([^'"]+)['"]/g,
            (_, varName, fnName) => `
              import ${varName}Impl from '${VIRTUAL_MODULE_PREFIX}${fnName}';
              export const ${varName} = ${varName}Impl;
            `
          ),
          map: null
        };
      }
    },
    // transform(code, id) {
    //   // Skip node_modules
    //   if (id.includes('node_modules')) return
    //   // Check for 'use server' directive at file level
    //   const isServerFile = code.trim().startsWith("'use server'") || 
    //                       code.trim().startsWith('"use server"')
    //   if (isServerFile) {
    //     serverFiles.add(id)
    //     // If client build, replace with proxy imports
    //     if (!isSSR) {
    //       return {
    //         code: generateClientProxy(id),
    //         map: null
    //       }
    //     }
    //     return
    //   }
    //   // Handle individual server functions
    //   if (code.includes('use server')) {
    //     if (!isSSR) {
    //       const s = new MagicString(code)
    //       // Transform server functions to client proxies
    //       return {
    //         code: transformServerFunctions(code, s),
    //         map: s.generateMap({ hires: true })
    //       }
    //     }
    //   }
    // },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET") {
          const csrfToken = createHash("sha256").update(Date.now().toString()).digest("hex");
          res.setHeader("X-CSRF-Token", csrfToken);
        }
        next();
      });
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__rpc/")) return next();
        const csrfToken = req.headers["x-csrf-token"];
        if (!csrfToken) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid CSRF token" }));
          return;
        }
        const functionName = req.url.replace("/__rpc/", "");
        const serverFunction = serverFunctionsMap.get(functionName);
        if (!serverFunction) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Function not found" }));
          return;
        }
        try {
          const body = await readBody(req);
          const args = JSON.parse(body || "[]");
          const result = await serverFunction.fn(...args);
          res.end(JSON.stringify({ data: result }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    }
  };
}
export {
  trpcPlugin as default
};
