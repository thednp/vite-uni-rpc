"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils.ts
var _fs = require('fs');
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var serverFunctionsMap = /* @__PURE__ */ new Map();
var isExpressRequest = (r) => {
  return "header" in r && "get" in r;
};
var isExpressResponse = (r) => {
  return "header" in r && "set" in r;
};
var resolveExtension = (filePath, extensions = [".tsx", ".jsx", ".ts", ".js"]) => {
  const [noExt] = _optionalChain([filePath, 'optionalAccess', _ => _.split, 'call', _2 => _2(".")]);
  const [noSlash] = noExt.slice(filePath.startsWith("/") ? 1 : 0);
  const paths = extensions.map((ext) => noSlash + ext);
  const path = paths.find((p) => _fs.existsSync.call(void 0, _path.resolve.call(void 0, _process2.default.cwd() + p)));
  return path || noExt + ".js";
};
var getViteConfig = async () => {
  const filePath = resolveExtension("/vite.config.ts");
  return (await Promise.resolve().then(() => _interopRequireWildcard(require("." + filePath)))).default;
};
var getRPCPluginConfig = async () => {
  const viteConfig = await getViteConfig();
  const rpcPluginConfig = _optionalChain([viteConfig, 'optionalAccess', _3 => _3.plugins, 'optionalAccess', _4 => _4.find, 'call', _5 => _5(
    (p) => p.name === "vite-mini-rpc"
  )]);
  if (!rpcPluginConfig) {
    console.warn(
      `The "vite-mini-rpc" plugin is not present in the current configuration.`
    );
    return;
  }
  return rpcPluginConfig.pluginOptions;
};
var readBody = (req) => {
  return new Promise((resolve2) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve2(body));
  });
};
var functionMappings = /* @__PURE__ */ new Map();
var scanForServerFiles = async (initialCfg, devServer) => {
  functionMappings.clear();
  let server = devServer;
  const config = !initialCfg && !devServer || !initialCfg ? {
    ...await getViteConfig(),
    server: { middlewareMode: true }
  } : initialCfg;
  if (!server) {
    const { createServer } = await Promise.resolve().then(() => _interopRequireWildcard(require("vite")));
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base
    });
  }
  const filePath = resolveExtension("/src/api/server.ts");
  try {
    const moduleExports = await server.ssrLoadModule("." + filePath);
    for (const [exportName, exportValue] of Object.entries(moduleExports)) {
      for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
        if (serverFn.name === registeredName && serverFn.fn === exportValue) {
          functionMappings.set(registeredName, exportName);
        }
      }
    }
  } catch (error) {
    console.error("Error loading file:", filePath, error);
  }
  if (!devServer) {
    server.close();
  }
};
var sendResponse = (res, response, statusCode = 200) => {
  if (isExpressResponse(res)) {
    return res.status(statusCode).set({ "Content-Type": "application/json" }).send(response);
  } else {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(response));
  }
};
var getModule = (fnName, fnEntry, options) => `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.rpcPreffix}/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(args)
  });
  return await handleResponse(response);
}
  `.trim();
var getClientModules = (options) => {
  return `
// Client-side RPC modules
const handleResponse = async (response) => {
if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
const result = await response.json();
if (result.error) throw new Error(result.error);
return result.data;
}
${Array.from(functionMappings.entries()).map(
    ([registeredName, exportName]) => getModule(registeredName, exportName, options)
  ).join("\n")}
`.trim();
};

// src/options.ts
var defaultCorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"]
};
var defaultCSRFOptions = {
  expires: 24,
  // 24h
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/"
};
var defaultServerFnOptions = {
  ttl: 10 * 1e3,
  // 10s
  invalidateKeys: []
};
var defaultRPCOptions = {
  cors: defaultCorsOptions,
  csrf: defaultCSRFOptions,
  rpcPreffix: "__rpc",
  headers: void 0,
  rateLimit: {
    windowMs: 5 * 60 * 1e3,
    //5m
    max: 100
  },
  onError: void 0,
  onRequest: void 0,
  onResponse: void 0
};
var defaultMiddlewareOptions = {
  rpcPreffix: defaultRPCOptions.rpcPreffix,
  path: void 0,
  headers: {},
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1e3
    // 5m
  },
  handler: void 0,
  onError: void 0,
  onRequest: void 0,
  onResponse: void 0
};

// src/createCors.ts
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var createCors = (initialOptions = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };
  return _cors2.default.call(void 0, options);
};

// src/cookie.ts
var _querystring = require('querystring');
function getCookies(req) {
  const cookieHeader = !isExpressRequest(req) ? req.headers.cookie : _optionalChain([req, 'access', _6 => _6.get, 'optionalCall', _7 => _7("cookie")]);
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
    _optionalChain([next, 'optionalCall', _8 => _8()]);
  };
};

// src/createMid.ts

var createMiddleware = (initialOptions = {}) => {
  const {
    rpcPreffix,
    path,
    headers,
    rateLimit,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ...defaultMiddlewareOptions,
    ...initialOptions
  };
  const rateLimitStore = rateLimit ? /* @__PURE__ */ new Map() : null;
  return async (req, res, next) => {
    const url = isExpressRequest(req) ? req.originalUrl : req.url;
    if (serverFunctionsMap.size === 0) {
      await scanForServerFiles();
    }
    if (!handler) {
      return _optionalChain([next, 'optionalCall', _9 => _9()]);
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return _optionalChain([next, 'optionalCall', _10 => _10()]);
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _11 => _11.startsWith, 'call', _12 => _12(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _13 => _13()]);
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          if (isExpressResponse(res)) {
            res.header(key, value);
          } else {
            res.setHeader(key, value);
          }
        });
      }
      if (rateLimit && rateLimitStore) {
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
          if (onResponse) {
            await onResponse(res);
          }
          sendResponse(res, { error: "Too Many Requests" }, 429);
          return;
        }
        clientState.count++;
        rateLimitStore.set(clientIp, clientState);
      }
      if (handler) {
        await handler(req, res, next);
        if (onResponse) {
          await onResponse(res);
        }
        return;
      }
      _optionalChain([next, 'optionalCall', _14 => _14()]);
    } catch (error) {
      if (onResponse) {
        await onResponse(res);
      }
      if (onError) {
        onError(error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        sendResponse(res, { error: "Middleware error:" + String(error) }, 500);
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...defaultMiddlewareOptions,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const url = isExpressRequest(req) ? req.originalUrl : req.url;
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _15 => _15.startsWith, 'call', _16 => _16(`/${rpcPreffix}/`)])) {
        return _optionalChain([next, 'optionalCall', _17 => _17()]);
      }
      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse(res, { error: "Unauthorized access" }, 403);
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
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
    },
    onError: (error, _req, res) => {
      console.error("RPC error:", error);
      sendResponse(res, { error: "Internal Server Error" }, 500);
    }
  });
};






















exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.isExpressRequest = isExpressRequest; exports.isExpressResponse = isExpressResponse; exports.resolveExtension = resolveExtension; exports.getViteConfig = getViteConfig; exports.getRPCPluginConfig = getRPCPluginConfig; exports.readBody = readBody; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.sendResponse = sendResponse; exports.getClientModules = getClientModules; exports.defaultServerFnOptions = defaultServerFnOptions; exports.defaultRPCOptions = defaultRPCOptions; exports.createCors = createCors; exports.getCookies = getCookies; exports.setSecureCookie = setSecureCookie; exports.createCSRF = createCSRF; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
