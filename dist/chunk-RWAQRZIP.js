var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils.ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
var serverFunctionsMap = /* @__PURE__ */ new Map();
var isExpressRequest = (r) => {
  return "header" in r && "get" in r;
};
var isExpressResponse = (r) => {
  return "header" in r && "set" in r;
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
    root: process.cwd(),
    base: process.env.BASE || "/",
    server: { middlewareMode: true }
  } : initialCfg;
  const apiDir = join(config.root, "src", "api");
  if (!server) {
    const { createServer } = await import("vite");
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base
    });
  }
  const files = (await readdir(apiDir, { withFileTypes: true })).filter((f) => f.name.includes("server.ts") || f.name.includes("server.js")).map((f) => join(apiDir, f.name));
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
import cors from "cors";
var createCors = (initialOptions = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };
  return cors(options);
};

// src/cookie.ts
import { parse as parseCookies } from "node:querystring";
function getCookies(req) {
  const cookieHeader = !isExpressRequest(req) ? req.headers.cookie : req.get?.("cookie");
  if (!cookieHeader) return {};
  return parseCookies(cookieHeader.replace(/; /g, "&"));
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
import { createHash } from "node:crypto";
var createCSRF = (initialOptions = {}) => {
  const options = { ...defaultCSRFOptions, ...initialOptions };
  return (req, res, next) => {
    const cookies = getCookies(req);
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = createHash("sha256").update(Date.now().toString()).digest("hex");
      setSecureCookie(res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + options.expires * 60 * 60 * 1e3).toUTCString()
      });
    }
    next?.();
  };
};

// src/createMid.ts
import process2 from "node:process";
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
      return next?.();
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return next?.();
      }
      if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
        return next?.();
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
      next?.();
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
      if (!url?.startsWith(`/${rpcPreffix}/`)) {
        return next?.();
      }
      const cookies = getCookies(req);
      const csrfToken = cookies["X-CSRF-Token"];
      if (!csrfToken) {
        if (process2.env.NODE_ENV === "development") {
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

export {
  __publicField,
  serverFunctionsMap,
  isExpressRequest,
  isExpressResponse,
  readBody,
  functionMappings,
  scanForServerFiles,
  sendResponse,
  getClientModules,
  defaultServerFnOptions,
  defaultRPCOptions,
  createCors,
  getCookies,
  setSecureCookie,
  createCSRF,
  createMiddleware,
  createRPCMiddleware
};
