"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/registry.ts
var serverFunctionsMap = /* @__PURE__ */ new Map();

// src/utils.ts
var _promises = require('fs/promises');
var _path = require('path');
var isExpressRequest = (r) => {
  return "header" in r;
};
var isExpressResponse = (r) => {
  return "header" in r;
};
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
var sendResponse = (res, data, statusCode = 200) => {
  if (isExpressResponse(res)) {
    return res.status(statusCode).set({ "Content-Type": "application/json" }).send(data);
  } else {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
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
function getCookies(req) {
  const cookieHeader = !isExpressRequest(req) ? req.headers.cookie : _optionalChain([req, 'access', _ => _.get, 'optionalCall', _2 => _2("cookie")]);
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
  if (isExpressResponse(res)) {
    res.set("Set-Cookie", cookieString);
  } else {
    res.setHeader("Set-Cookie", cookieString);
  }
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
    const cookies = getCookies(req);
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = _crypto.createHash.call(void 0, "sha256").update(Date.now().toString()).digest("hex");
      setSecureCookie(res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + options.expires * 60 * 60 * 1e3).toUTCString()
      });
    }
    _optionalChain([next, 'optionalCall', _3 => _3()]);
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
  transform: void 0,
  onError: void 0
};
var createMiddleware = (initialOptions = {}) => {
  const { rpcPrefix, path, headers, rateLimit, transform, onError } = {
    ...middlewareDefaults,
    ...initialOptions
  };
  const rateLimitStore = rateLimit ? /* @__PURE__ */ new Map() : null;
  return (req, res, next) => {
    const url = isExpressRequest(req) ? req.originalUrl : req.url;
    try {
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return next();
      }
      if (rpcPrefix && !_optionalChain([url, 'optionalAccess', _4 => _4.startsWith, 'call', _5 => _5(rpcPrefix)])) return next();
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          if (isExpressResponse(res)) {
            res.set(key, value);
          } else {
            res.setHeader(key, value);
          }
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
          sendResponse(res, { error: "Too Many Requests" }, 429);
          return;
        }
        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }
      const originalEnd = res.end.bind(res);
      res.end = function(chunk, encoding, callback) {
        try {
          if (transform && chunk && typeof chunk !== "function") {
            const data = typeof chunk === "string" ? JSON.parse(chunk) : chunk;
            chunk = JSON.stringify(transform(data, req, res));
          }
        } catch (error) {
          console.error("Response handling error:", String(error));
        }
        if (chunk && (typeof chunk === "function" || encoding === void 0 && callback === void 0)) {
          return originalEnd(chunk);
        }
        if (chunk && typeof encoding === "function") {
          return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding, callback);
      };
      return _optionalChain([next, 'optionalCall', _6 => _6()]);
    } catch (error) {
      if (onError) {
        onError(error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        sendResponse(res, { error: "Internal Server Error" }, 500);
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  return async (req, res, next) => {
    const options = { ...defaultRPCOptions, ...initialOptions };
    const url = isExpressRequest(req) ? req.originalUrl : req.url;
    try {
      if (!_optionalChain([url, 'optionalAccess', _7 => _7.startsWith, 'call', _8 => _8(`/${options.rpcPrefix}/`)])) return next();
      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse(res, { error: "Unauthorized access" }, 403);
        return;
      }
      const functionName = _optionalChain([url, 'optionalAccess', _9 => _9.replace, 'call', _10 => _10(`/${options.rpcPrefix}/`, "")]);
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse(
          res,
          { error: `Function "${functionName}" not found` },
          404
        );
        return;
      }
      const body = await readBody(req);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      sendResponse(res, { data: result }, 200);
    } catch (error) {
      console.error("RPC error:", error);
      sendResponse(res, { error: "Internal Server Error" }, 500);
    }
  };
};

// src/midRPC.ts
var rpcMiddleware = createRPCMiddleware();

















exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.getModule = getModule; exports.defaultRPCOptions = defaultRPCOptions; exports.createCors = createCors; exports.corsMiddleware = corsMiddleware; exports.getCookies = getCookies; exports.setSecureCookie = setSecureCookie; exports.createCSRF = createCSRF; exports.csrfMiddleware = csrfMiddleware; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.rpcMiddleware = rpcMiddleware;
