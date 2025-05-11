"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var __defProp = Object.defineProperty;
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
var isKoaRequest = (req) => {
  return "req" in req;
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
var isKoaResponse = (res) => {
  return "res" in res;
};
var isExpressResponse = (res) => {
  return "json" in res && "send" in res;
};
var getRequestDetails = (request) => {
  const nodeRequest = isHonoRequest(request) ? request.raw : isKoaRequest(request) ? request.req : request;
  const url = isExpressRequest(request) ? request.originalUrl : nodeRequest.url;
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
  rpcPreffix: void 0,
  expires: 24,
  // 24h
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/"
};
var defaultServerFnOptions = {
  // contentType: "application/json",
  ttl: 10 * 1e3,
  // 10s
  invalidateKeys: []
};
var defaultRPCOptions = {
  rpcPreffix: "__rpc",
  adapter: "express",
  cors: {},
  csrf: {},
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
  // rpcPreffix: defaultRPCOptions.rpcPreffix,
  rpcPreffix: void 0,
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
























exports.__publicField = __publicField; exports.serverFunctionsMap = serverFunctionsMap; exports.isNodeRequest = isNodeRequest; exports.isHonoRequest = isHonoRequest; exports.isKoaRequest = isKoaRequest; exports.isExpressRequest = isExpressRequest; exports.isNodeResponse = isNodeResponse; exports.isHonoResponse = isHonoResponse; exports.isKoaResponse = isKoaResponse; exports.isExpressResponse = isExpressResponse; exports.getRequestDetails = getRequestDetails; exports.getResponseDetails = getResponseDetails; exports.readBody = readBody; exports.functionMappings = functionMappings; exports.scanForServerFiles = scanForServerFiles; exports.sendResponse = sendResponse; exports.getClientModules = getClientModules; exports.defaultCorsOptions = defaultCorsOptions; exports.defaultCSRFOptions = defaultCSRFOptions; exports.defaultServerFnOptions = defaultServerFnOptions; exports.defaultRPCOptions = defaultRPCOptions; exports.defaultMiddlewareOptions = defaultMiddlewareOptions;
