"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => trpcPlugin
});
module.exports = __toCommonJS(src_exports);
var import_magic_string = __toESM(require("magic-string"), 1);
var import_node_crypto = require("crypto");

// src/utils.ts
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
}
function generateClientProxy(id) {
  return `
    import { createServerProxy } from 'vite-plugin-trpc/client'
    
    export const __SERVER_FILE__ = true
    ${id} // This will be processed by the plugin later
  `;
}
function transformServerFunctions(code, ms) {
  return ms.toString();
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
  const serverFiles = /* @__PURE__ */ new Set();
  return {
    name: "vite-plugin-rpc",
    config(config) {
      isSSR = !!config.build?.ssr;
    },
    transform(code, id) {
      if (id.includes("node_modules")) return;
      const isServerFile = code.trim().startsWith("'use server'") || code.trim().startsWith('"use server"');
      if (isServerFile) {
        serverFiles.add(id);
        if (!isSSR) {
          return {
            code: generateClientProxy(id),
            map: null
          };
        }
        return;
      }
      if (code.includes("use server")) {
        if (!isSSR) {
          const s = new import_magic_string.default(code);
          return {
            code: transformServerFunctions(code, s),
            map: s.generateMap({ hires: true })
          };
        }
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET") {
          const csrfToken = (0, import_node_crypto.createHash)("sha256").update(Date.now().toString()).digest("hex");
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
