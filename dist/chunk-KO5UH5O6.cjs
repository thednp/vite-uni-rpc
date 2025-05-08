"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/registry.ts
var serverFunctionsMap = /* @__PURE__ */ new Map();

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
var scanForServerFiles = async (config, devServer) => {
  functionMappings.clear();
  const apiDir = _path.join.call(void 0, config.root, "src", "api");
  let server = devServer;
  if (!server) {
    const { createServer } = await Promise.resolve().then(() => _interopRequireWildcard(require("vite")));
    server = await createServer({
      server: { ...config.server, middlewareMode: true },
      appType: "custom",
      base: config.base
    });
  }
  const files = (await _promises.readdir.call(void 0, apiDir, { withFileTypes: true })).filter((f) => f.name.includes("server.ts") || f.name.includes("server.js")).map((f) => _path.join.call(void 0, apiDir, f.name));
  for (const file of files) {
    try {
      const moduleExports = await server.ssrLoadModule(file);
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
          if (serverFn.name === registeredName && serverFn.fn === exportValue) {
            functionMappings.set(registeredName, exportName);
          }
        }
      }
    } catch (error) {
      console.error("Error loading server file:", file, error);
    }
    if (!devServer) {
      server.close();
    }
  }
};
var getModule = (fnName, fnEntry, options) => `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.rpcPrefix}/${fnName}', {
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

// src/options.ts
var defaultRPCOptions = {
  ttl: 1e4,
  rpcPrefix: "__rpc"
};

// src/createCors.ts
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var defaultCorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"]
};
var createCors = (initialOptions = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };
  return _cors2.default.call(void 0, options);
};

// src/midCors.ts
var corsMiddleware = createCors();

// src/cookie.ts
var _querystring = require('querystring');
function getCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return _querystring.parse.call(void 0, cookieHeader.replace(/; /g, "&"));
}
var defaultsTokenOptions = {
  expires: "",
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/"
};
function setSecureCookie(res, name, value, options = {}) {
  const cookieOptions = { ...defaultsTokenOptions, ...options };
  const cookieString = Object.entries(cookieOptions).reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);
  _optionalChain([res, 'optionalAccess', _ => _.setHeader, 'call', _2 => _2("Set-Cookie", cookieString)]);
  _optionalChain([res, 'optionalAccess', _3 => _3.header, 'call', _4 => _4("Set-Cookie", cookieString)]);
}

// src/createCSRF.ts
var _crypto = require('crypto');
var defaultCSRFOptions = {
  expires: 24,
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/"
};
var createCSRF = (initialOptions = {}) => {
  const options = { ...defaultCSRFOptions, ...initialOptions };
  return (req, res, next) => {
    const cookies = getCookies(_optionalChain([req, 'optionalAccess', _5 => _5.headers, 'optionalAccess', _6 => _6.cookie]) || _optionalChain([req, 'optionalAccess', _7 => _7.header, 'optionalCall', _8 => _8("cookie")]));
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = _crypto.createHash.call(void 0, "sha256").update(Date.now().toString()).digest("hex");
      setSecureCookie(res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + options.expires * 60 * 60 * 1e3).toUTCString()
      });
    }
    _optionalChain([next, 'optionalCall', _9 => _9()]);
  };
};

// src/midCSRF.ts
var csrfMiddleware = createCSRF();

// src/createMid.ts
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var middlewareDefaults = {
  rpcPrefix: void 0,
  path: void 0,
  headers: {},
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1e3
    // 5m
  },
  handler: void 0,
  onError: void 0
};
var createMiddleware = (initialOptions = {}) => {
  const { rpcPrefix, path, headers, rateLimit, handler, onError } = {
    ...middlewareDefaults,
    ...initialOptions
  };
  const rateLimitStore = rateLimit ? /* @__PURE__ */ new Map() : null;
  return async (req, res, next) => {
    try {
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(req.url || "")) return _optionalChain([next, 'optionalCall', _10 => _10()]);
      }
      if (rpcPrefix && !_optionalChain([req, 'access', _11 => _11.url, 'optionalAccess', _12 => _12.startsWith, 'call', _13 => _13(rpcPrefix)])) {
        return _optionalChain([next, 'optionalCall', _14 => _14()]);
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          _optionalChain([res, 'optionalAccess', _15 => _15.setHeader, 'call', _16 => _16(key, value)]);
          _optionalChain([res, 'optionalAccess', _17 => _17.header, 'call', _18 => _18(key, value)]);
        });
      }
      if (rateLimitStore) {
        const clientIp = req.socket.remoteAddress || "unknown";
        const now = Date.now();
        const clientState = rateLimitStore.get(clientIp) || {
          count: 0,
          resetTime: now + rateLimit.windowMs
        };
        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now + rateLimit.windowMs;
        }
        if (clientState.count >= rateLimit.max) {
          res.statusCode = 429;
          res.end("Too Many Requests");
          return;
        }
        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }
      if (handler) {
        return await handler(req, res, next);
      }
      return _optionalChain([next, 'optionalCall', _19 => _19()]);
    } catch (error) {
      if (onError) {
        onError(error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = { ...defaultRPCOptions, ...initialOptions };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      if (!_optionalChain([req, 'access', _20 => _20.url, 'optionalAccess', _21 => _21.startsWith, 'call', _22 => _22(`/${options.rpcPrefix}/`)])) {
        return _optionalChain([next, 'optionalCall', _23 => _23()]);
      }
      const cookies = getCookies(_optionalChain([req, 'optionalAccess', _24 => _24.headers, 'optionalAccess', _25 => _25.cookie]) || _optionalChain([req, 'optionalAccess', _26 => _26.header, 'optionalCall', _27 => _27("cookie")]));
      const csrfToken = cookies["X-CSRF-Token"];
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "Unauthorized access" }));
        return;
      }
      const functionName = req.url.replace(`/${options.rpcPrefix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ error: `Function "${functionName}" not found` })
        );
        return;
      }
      const body = await readBody(req);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      res.statusCode = 200;
      res.end(JSON.stringify({ data: result }));
    },
    onError: (error, _req, res) => {
      console.error("RPC error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  });
};

// src/midRPC.ts
var rpcMiddleware = createRPCMiddleware();

















exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.getModule = getModule; exports.defaultRPCOptions = defaultRPCOptions; exports.createCors = createCors; exports.corsMiddleware = corsMiddleware; exports.getCookies = getCookies; exports.setSecureCookie = setSecureCookie; exports.createCSRF = createCSRF; exports.csrfMiddleware = csrfMiddleware; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.rpcMiddleware = rpcMiddleware;
