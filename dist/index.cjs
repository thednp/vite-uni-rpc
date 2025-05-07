"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

var _chunkXBNGK7Y3cjs = require('./chunk-XBNGK7Y3.cjs');

// src/index.ts
var _crypto = require('crypto');
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var _promises = require('fs/promises');

// src/utils.ts
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
}

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
function trpcPlugin() {
  let config;
  const functionMappings = /* @__PURE__ */ new Map();
  async function scanForServerFiles(root) {
    const apiDir = _path.join.call(void 0, root, "src", "api");
    const files = (await _promises.readdir.call(void 0, apiDir, { withFileTypes: true })).filter(
      (f) => {
        return f.name.includes("server.ts") || f.name.includes("server.js");
      }
    ).map((f) => _path.join.call(void 0, apiDir, f.name));
    for (const file of files) {
      try {
        const fileUrl = `file://${file}`;
        const moduleExports = await Promise.resolve().then(() => _interopRequireWildcard(require(fileUrl)));
        for (const [exportName, exportValue] of Object.entries(moduleExports)) {
          for (const [registeredName, serverFn] of _chunkXBNGK7Y3cjs.serverFunctionsMap.entries()) {
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
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      _chunkXBNGK7Y3cjs.serverFunctionsMap.clear();
    },
    transform(code, _id, ops) {
      if (!code.includes("createServerFunction") || _process2.default.env.MODE !== "production" || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
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
  return result.data;
}
`.trim();
      const transformedCode = `
// Client-side RPC modules
${Array.from(functionMappings.entries()).map(
        ([registeredName, exportName]) => getModule(registeredName, exportName)
      ).join("\n")}
`.trim();
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
        if (!_optionalChain([req, 'access', _2 => _2.url, 'optionalAccess', _3 => _3.startsWith, 'call', _4 => _4("/__rpc/")])) return next();
        const cookies = getCookies(req.headers.cookie);
        const csrfToken = cookies["X-CSRF-Token"];
        if (!csrfToken) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid CSRF token" }));
          return;
        }
        const functionName = req.url.replace("/__rpc/", "");
        const serverFunction = _chunkXBNGK7Y3cjs.serverFunctionsMap.get(functionName);
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


exports.default = trpcPlugin;
