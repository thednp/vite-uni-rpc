"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }



var _chunk4DCGKLDMcjs = require('./chunk-4DCGKLDM.cjs');








var _chunkAJLVM5DQcjs = require('./chunk-AJLVM5DQ.cjs');

// src/express/createCSRF.ts
var _crypto = require('crypto');
var createCSRF = (initialOptions = {}) => {
  const options = { ..._chunkAJLVM5DQcjs.defaultCSRFOptions, ...initialOptions };
  return (req, res, next) => {
    const cookies = _chunk4DCGKLDMcjs.getCookies.call(void 0, req);
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = _crypto.createHash.call(void 0, "sha256").update(Date.now().toString()).digest("hex");
      _chunk4DCGKLDMcjs.setSecureCookie.call(void 0, res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + options.expires * 60 * 60 * 1e3).toUTCString()
      });
    }
    _optionalChain([next, 'optionalCall', _ => _()]);
  };
};

// src/express/createCors.ts
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var createCors = (initialOptions = {}) => {
  const options = { ..._chunkAJLVM5DQcjs.defaultCorsOptions, ...initialOptions };
  return _cors2.default.call(void 0, options);
};

// src/express/createMid.ts
var _process = require('process'); var _process2 = _interopRequireDefault(_process);

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
    ..._chunkAJLVM5DQcjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  const rateLimitStore = rateLimit ? /* @__PURE__ */ new Map() : null;
  return async (req, res, next) => {
    const { url, nodeRequest } = getRequestDetails(req);
    const { sendResponse, setHeader } = getResponseDetails(res);
    if (_chunkAJLVM5DQcjs.serverFunctionsMap.size === 0) {
      await _chunkAJLVM5DQcjs.scanForServerFiles.call(void 0, );
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
          resetTime: now + (rateLimit.windowMs || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.windowMs)
        };
        if (now > clientState.resetTime) {
          clientState.count = 0;
          clientState.resetTime = now + (rateLimit.windowMs || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.windowMs);
        }
        if (clientState.count >= (rateLimit.max || _chunkAJLVM5DQcjs.defaultRPCOptions.rateLimit.max)) {
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
      _optionalChain([next, 'optionalCall', _7 => _7()]);
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
    ..._chunkAJLVM5DQcjs.defaultMiddlewareOptions,
    // RPC middleware needs to have an RPC preffix
    rpcPreffix: _chunkAJLVM5DQcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url, nodeRequest } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _8 => _8.startsWith, 'call', _9 => _9(`/${rpcPreffix}/`)])) {
        return _optionalChain([next, 'optionalCall', _10 => _10()]);
      }
      const csrfToken = _chunk4DCGKLDMcjs.getCookie.call(void 0, req, "X-CSRF-Token");
      if (!csrfToken) {
        if (_process2.default.env.NODE_ENV === "development") {
          console.error("RPC middleware requires CSRF middleware");
        }
        sendResponse(403, { error: "Unauthorized" });
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkAJLVM5DQcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      const body = await _chunkAJLVM5DQcjs.readBody.call(void 0, nodeRequest);
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









exports.createCSRF = createCSRF; exports.createCors = createCors; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.getRequestDetails = getRequestDetails; exports.getResponseDetails = getResponseDetails; exports.isExpressRequest = isExpressRequest; exports.isExpressResponse = isExpressResponse;
