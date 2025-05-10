"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils.ts
var _promises = require('fs/promises');
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var serverFunctionsMap = /* @__PURE__ */ new Map();
var isNodeRequest = (req) => {
  return "url" in req && !("raw" in req) && !("originalUrl" in req);
};
var isHonoRequest = (req) => {
  return "raw" in req;
};
var isExpressRequest = (req) => {
  return "originalUrl" in req;
};
var isNodeResponse = (res) => {
  return "end" in res && !("raw" in res) && !("json" in res);
};
var isHonoResponse = (res) => {
  return "raw" in res;
};
var isExpressResponse = (res) => {
  return "json" in res && "send" in res;
};
var getRequestDetails = (request) => {
  const nodeRequest = request.raw || request.req || request;
  const url = request.originalUrl || request.url || nodeRequest.url;
  return {
    nodeRequest,
    url,
    headers: nodeRequest.headers,
    method: nodeRequest.method
  };
};
var getResponseDetails = (response) => {
  const nodeResponse = response.raw || response.res || response;
  const isResponseSent = response.headersSent || response.writableEnded || nodeResponse.writableEnded;
  const setHeader = (name, value) => {
    if (response.header) {
      response.header(name, value);
    } else if (response.setHeader) {
      response.setHeader(name, value);
    } else {
      nodeResponse.setHeader(name, value);
    }
  };
  const getHeader = (name) => {
    if (response.getHeader) {
      return response.getHeader(name);
    }
    return nodeResponse.getHeader(name);
  };
  const setStatusCode = (code) => {
    if (response.status) {
      response.status(code);
    } else {
      nodeResponse.statusCode = code;
    }
  };
  const send = (output) => {
    if (response.send) {
      response.send(JSON.stringify(output));
    } else {
      nodeResponse.end(JSON.stringify(output));
    }
  };
  const sendResponse2 = (code, output, contentType) => {
    setStatusCode(code);
    if (contentType) {
      setHeader("Content-Type", contentType);
    }
    send(output);
  };
  return {
    nodeResponse,
    isResponseSent,
    setHeader,
    getHeader,
    statusCode: nodeResponse.statusCode,
    setStatusCode,
    send,
    sendResponse: sendResponse2
  };
};
var readBody = (req) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
};
var functionMappings = /* @__PURE__ */ new Map();
var scanForServerFiles = async (initialCfg, devServer) => {
  functionMappings.clear();
  let server = devServer;
  const config = !initialCfg && !devServer || !initialCfg ? {
    root: _process2.default.cwd(),
    base: _process2.default.env.BASE || "/",
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
  const svFiles = [
    "server.ts",
    "server.js",
    "server.mjs",
    "server.mts"
  ];
  const apiDir = _path.join.call(void 0, config.root, "src", "api");
  const files = (await _promises.readdir.call(void 0, apiDir, { withFileTypes: true })).filter((f) => svFiles.some((fn) => f.name.includes(fn))).map((f) => _path.join.call(void 0, apiDir, f.name));
  for (const file of files) {
    try {
      const moduleExports = await server.ssrLoadModule(
        file
      );
      const moduleEntries = Object.entries(moduleExports);
      if (!moduleEntries.length) {
        console.warn("No server function found.");
        if (!devServer) {
          server.close();
        }
        return;
      }
      for (const [exportName, exportValue] of moduleEntries) {
        for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
          if (serverFn.name === registeredName && serverFn.fn === exportValue) {
            functionMappings.set(registeredName, exportName);
          }
        }
      }
      if (!devServer) {
        server.close();
      }
    } catch (error) {
      console.error("Error loading file:", file, error);
    }
  }
};
var sendResponse = (res, output, statusCode = 200) => {
  if (isExpressResponse(res)) {
    return res.status(statusCode).set({ "Content-Type": "application/json" }).send(output);
  } else {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(output));
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
  const { headers } = getRequestDetails(req);
  const cookieHeader = headers["cookie"];
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
  const { setHeader } = getResponseDetails(res);
  const cookieString = Object.entries(cookieOptions).reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);
  setHeader("Set-Cookie", cookieString);
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
    _optionalChain([next, 'optionalCall', _ => _()]);
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
    const { url, nodeRequest } = getRequestDetails(req);
    const { sendResponse: sendResponse2, setHeader } = getResponseDetails(res);
    if (serverFunctionsMap.size === 0) {
      await scanForServerFiles();
    }
    if (!handler) {
      return _optionalChain([next, 'optionalCall', _2 => _2()]);
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return _optionalChain([next, 'optionalCall', _3 => _3()]);
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _4 => _4.startsWith, 'call', _5 => _5(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _6 => _6()]);
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          setHeader(key, value);
        });
      }
      if (rateLimit && rateLimitStore) {
        const clientIp = nodeRequest.socket.remoteAddress || "unknown";
        const now = Date.now();
        const clientState = rateLimitStore.get(clientIp) || {
          count: 0,
          resetTime: now + (rateLimit.windowMs || defaultRPCOptions.rateLimit.windowMs)
        };
        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now + (rateLimit.windowMs || defaultRPCOptions.rateLimit.windowMs);
        }
        if (clientState.count >= (rateLimit.max || defaultRPCOptions.rateLimit.max)) {
          if (onResponse) {
            await onResponse(res);
          }
          sendResponse2(429, { error: "Too Many Requests" });
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
      _optionalChain([next, 'optionalCall', _7 => _7()]);
    } catch (error) {
      if (onResponse) {
        await onResponse(res);
      }
      if (onError) {
        onError(error, req, res);
      } else {
        console.error("Middleware error:", String(error));
        sendResponse2(500, { error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    // rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...defaultMiddlewareOptions,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url, nodeRequest } = getRequestDetails(req);
      const { sendResponse: sendResponse2 } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _8 => _8.startsWith, 'call', _9 => _9(`/${rpcPreffix}/`)])) {
        return _optionalChain([next, 'optionalCall', _10 => _10()]);
      }
      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse2(403, { error: "Unauthorized access" });
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse2(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      const body = await readBody(nodeRequest);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      sendResponse2(200, { data: result });
    },
    onError: (error, _req, res) => {
      const { sendResponse: sendResponse2 } = getResponseDetails(res);
      console.error("RPC error:", error);
      sendResponse2(500, { error: "Internal Server Error" });
    }
  });
};

























exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.isNodeRequest = isNodeRequest; exports.isHonoRequest = isHonoRequest; exports.isExpressRequest = isExpressRequest; exports.isNodeResponse = isNodeResponse; exports.isHonoResponse = isHonoResponse; exports.isExpressResponse = isExpressResponse; exports.getRequestDetails = getRequestDetails; exports.getResponseDetails = getResponseDetails; exports.readBody = readBody; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.sendResponse = sendResponse; exports.getClientModules = getClientModules; exports.defaultServerFnOptions = defaultServerFnOptions; exports.defaultRPCOptions = defaultRPCOptions; exports.createCors = createCors; exports.getCookies = getCookies; exports.setSecureCookie = setSecureCookie; exports.createCSRF = createCSRF; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
