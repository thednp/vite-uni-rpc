"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => trpcPlugin
});
module.exports = __toCommonJS(src_exports);
var import_node_crypto = require("crypto");

// src/serverFunctionsMap.ts
var serverFunctionsMap = /* @__PURE__ */ new Map();

// src/index.ts
var import_node_path = require("path");
var import_promises = require("fs/promises");

// src/utils.ts
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
}

// src/cookie.ts
var import_node_querystring = require("querystring");
function getCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return (0, import_node_querystring.parse)(cookieHeader.replace(/; /g, "&"));
}
function setSecureCookie(res, name, value, options = {}) {
  const defaults = {
    HttpOnly: "true",
    Secure: "true",
    SameSite: "Strict",
    Path: "/"
  };
  const cookieOptions = { ...defaults, ...options };
  const cookieString = Object.entries(cookieOptions).reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);
  res.setHeader("Set-Cookie", cookieString);
}

// src/index.ts
function trpcPlugin() {
  let config;
  let serverFiles = /* @__PURE__ */ new Set();
  const functionMappings = /* @__PURE__ */ new Map();
  async function scanForServerFiles(root) {
    const apiDir = (0, import_node_path.join)(root, "src", "api");
    const files = (await (0, import_promises.readdir)(apiDir, { withFileTypes: true })).filter((f) => {
      return f.name.includes("server.ts") || f.name.includes("server.js");
    }).map((f) => (0, import_node_path.join)(apiDir, f.name));
    for (const file of files) {
      try {
        serverFiles.add(file);
        const fileUrl = `file://${file}`;
        const moduleExports = await import(fileUrl);
        for (const [exportName, exportValue] of Object.entries(moduleExports)) {
          for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
            if (serverFn.fn === exportValue) {
              functionMappings.set(registeredName, exportName);
            }
          }
        }
      } catch (error) {
        console.error("Error loading server file:", file, error);
      }
    }
  }
  return {
    name: "vite-plugin-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      serverFunctionsMap.clear();
    },
    async transform(code, _id, ops) {
      if (!code.includes("createServerFunction") || ops?.ssr) {
        return null;
      }
      const getModule = (fnName, fnEntry) => `
export const ${fnEntry} = async (...args) => {
  // const requestToken = await getToken();
  const response = await fetch('/__rpc/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return JSON.parse(JSON.stringify(result)).data;
}
`;
      const transformedCode = `
// Client-side RPC modules
${Array.from(functionMappings.entries()).map(
        ([registeredName, exportName]) => getModule(registeredName, exportName)
      ).join("\n\n")}
`;
      return {
        // code: result.code,
        code: transformedCode,
        map: null
      };
    },
    configureServer(server) {
      scanForServerFiles(config.root);
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        const cookies = getCookies(req.headers.cookie);
        if (!cookies["X-CSRF-Token"]) {
          const csrfToken = (0, import_node_crypto.createHash)("sha256").update(Date.now().toString()).digest("hex");
          setSecureCookie(res, "X-CSRF-Token", csrfToken, {
            // Can add additional options here
            expires: new Date(Date.now() + 24 * 60 * 60 * 1e3).toUTCString(),
            // 24h
            SameSite: "Strict"
            // Prevents CSRF attacks
          });
        }
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__rpc/")) return next();
        const cookies = getCookies(req.headers.cookie);
        const csrfToken = cookies["X-CSRF-Token"];
        if (!csrfToken) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid CSRF token" }));
          return;
        }
        const functionName = req.url.replace("/__rpc/", "");
        const serverFunction = serverFunctionsMap.get(functionName);
        if (!serverFunction) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Function "${functionName}" not found` }));
          return;
        }
        try {
          const body = await readBody(req);
          const args = JSON.parse(body || "[]");
          const result = await serverFunction.fn(...args);
          res.end(JSON.stringify({ data: result }));
        } catch (error) {
          console.error("RPC error:", error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    }
  };
}
