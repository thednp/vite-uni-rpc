import {
  getCookie,
  getCookies,
  setSecureCookie
} from "./chunk-KFVYA5E5.js";
import {
  defaultCSRFOptions,
  defaultCorsOptions,
  defaultMiddlewareOptions,
  defaultRPCOptions,
  readBody,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-JKZP7UJS.js";

// src/express/createCSRF.ts
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

// src/express/createCors.ts
import cors from "cors";
var createCors = (initialOptions = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };
  return cors(options);
};

// src/express/createMid.ts
import process from "node:process";

// src/express/helpers.ts
var isExpressRequest = (req) => {
  return "originalUrl" in req;
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
  const sendResponse = (code, output, contentType) => {
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
    sendResponse
  };
};

// src/express/createMid.ts
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
    const { sendResponse, setHeader } = getResponseDetails(res);
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
          sendResponse(429, { error: "Too Many Requests" });
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
        sendResponse(500, { error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ...defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url, nodeRequest } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!url?.startsWith(`/${rpcPreffix}/`)) {
        return next?.();
      }
      const csrfToken = getCookie(req, "X-CSRF-Token");
      if (!csrfToken) {
        if (process.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse(403, { error: "Unauthorized" });
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      const body = await readBody(nodeRequest);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      sendResponse(200, { data: result });
    },
    onError: (error, _req, res) => {
      const { sendResponse } = getResponseDetails(res);
      console.error("RPC error:", error);
      sendResponse(500, { error: "Internal Server Error" });
    }
  });
};
export {
  createCSRF,
  createCors,
  createMiddleware,
  createRPCMiddleware,
  getRequestDetails,
  getResponseDetails,
  isExpressRequest,
  isExpressResponse
};
