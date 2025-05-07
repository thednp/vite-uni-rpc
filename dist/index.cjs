"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


var _chunkMVVEXO4Ucjs = require('./chunk-MVVEXO4U.cjs');

// src/index.ts
var _crypto = require('crypto');
var _vite = require('vite');

// src/utils.ts
var _promises = require('fs/promises');
var _path = require('path');
var readBody = (req) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
};
var functionMappings = /* @__PURE__ */ new Map();
var scanForServerFiles = async (config, server) => {
  functionMappings.clear();
  const apiDir = _path.join.call(void 0, config.root, "src", "api");
  const files = (await _promises.readdir.call(void 0, apiDir, { withFileTypes: true })).filter((f) => f.name.includes("server.ts") || f.name.includes("server.js")).map((f) => _path.join.call(void 0, apiDir, f.name));
  for (const file of files) {
    try {
      const moduleExports = await server.ssrLoadModule(file);
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        for (const [registeredName, serverFn] of _chunkMVVEXO4Ucjs.serverFunctionsMap.entries()) {
          if (serverFn.name === registeredName && serverFn.fn === exportValue) {
            functionMappings.set(registeredName, exportName);
          }
        }
      }
    } catch (error) {
      console.error("Error loading server file:", file, error);
    }
  }
};
var getModule = (fnName, fnEntry, options) => `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.urlPrefix}/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
  `.trim();

// src/cookie.ts
var _querystring = require('querystring');
function getCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return _querystring.parse.call(void 0, cookieHeader.replace(/; /g, "&"));
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
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkMVVEXO4Ucjs.defaultOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      _chunkMVVEXO4Ucjs.serverFunctionsMap.clear();
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // config.command === "build" && process.env.MODE !== "production" ||
      _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      if (functionMappings.size === 0) {
        await scanForServerFiles(config, viteServer);
      }
      const transformedCode = `
// Client-side RPC modules
${Array.from(functionMappings.entries()).map(
        ([registeredName, exportName]) => getModule(registeredName, exportName, options)
      ).join("\n")}
`.trim();
      const result = await _vite.transformWithEsbuild.call(void 0, transformedCode, id, {
        loader: "js",
        target: "es2020"
      });
      return {
        // code: transformedCode,
        code: result.code,
        map: null
      };
    },
    configureServer(server) {
      viteServer = server;
      scanForServerFiles(config, server);
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type,X-CSRF-Token"
        );
        res.setHeader("Access-Control-Allow-Credentials", "true");
        const cookies = getCookies(req.headers.cookie);
        if (!cookies["X-CSRF-Token"]) {
          const csrfToken = _crypto.createHash.call(void 0, "sha256").update(Date.now().toString()).digest("hex");
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
        if (!_optionalChain([req, 'access', _2 => _2.url, 'optionalAccess', _3 => _3.startsWith, 'call', _4 => _4(`/${options.urlPrefix}/`)])) return next();
        const cookies = getCookies(req.headers.cookie);
        const csrfToken = cookies["X-CSRF-Token"];
        if (!csrfToken) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid CSRF token" }));
          return;
        }
        const functionName = req.url.replace(`/${options.urlPrefix}/`, "");
        const serverFunction = _chunkMVVEXO4Ucjs.serverFunctionsMap.get(functionName);
        if (!serverFunction) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({ error: `Function "${functionName}" not found` })
          );
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


exports.default = rpcPlugin;
