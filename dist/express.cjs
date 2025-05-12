"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunkI745QCC6cjs = require('./chunk-I745QCC6.cjs');

// src/express/helpers.ts
var readBody = (req) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => resolve(body));
  });
};
var isExpressRequest = (req) => {
  return "originalUrl" in req;
};
var isExpressResponse = (res) => {
  return "json" in res && "send" in res;
};
var getRequestDetails = (request) => {
  const url = isExpressRequest(request) ? request.originalUrl : request.url;
  return {
    url,
    headers: request.headers,
    method: request.method
  };
};
var getResponseDetails = (response) => {
  const isResponseSent = response.headersSent || response.writableEnded;
  const setHeader = (name, value) => {
    if (isExpressResponse(response)) {
      response.header(name, value);
    } else {
      response.setHeader(name, value);
    }
  };
  const getHeader = (name) => {
    if (isExpressResponse(response)) {
      return response.getHeader(name);
    }
    return response.getHeader(name);
  };
  const setStatusCode = (code) => {
    if (isExpressResponse(response)) {
      response.status(code);
    } else {
      response.statusCode = code;
    }
  };
  const sendResponse = (code, output) => {
    setStatusCode(code);
    if (isExpressResponse(response)) {
      response.send(JSON.stringify(output));
    } else {
      response.end(JSON.stringify(output));
    }
  };
  return {
    isResponseSent,
    setHeader,
    getHeader,
    statusCode: response.statusCode,
    setStatusCode,
    sendResponse
  };
};

// src/express/createMiddleware.ts
var createMiddleware = (initialOptions = {}) => {
  const {
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ..._chunkI745QCC6cjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  return async (req, res, next) => {
    const { url } = getRequestDetails(req);
    const { sendResponse, setHeader } = getResponseDetails(res);
    if (_chunkI745QCC6cjs.serverFunctionsMap.size === 0) {
      await _chunkI745QCC6cjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      return _optionalChain([next, 'optionalCall', _ => _()]);
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return _optionalChain([next, 'optionalCall', _2 => _2()]);
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _3 => _3.startsWith, 'call', _4 => _4(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _5 => _5()]);
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          setHeader(key, value);
        });
      }
      if (handler) {
        await handler(req, res, next);
        if (onResponse) {
          await onResponse(res);
        }
        return;
      }
      _optionalChain([next, 'optionalCall', _6 => _6()]);
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
    ..._chunkI745QCC6cjs.defaultMiddlewareOptions,
    // RPC middleware needs to have the RPC preffix
    rpcPreffix: _chunkI745QCC6cjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _7 => _7.startsWith, 'call', _8 => _8(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _9 => _9()]);
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkI745QCC6cjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      const body = await readBody(req);
      const args = JSON.parse(body || "[]");
      const result = await serverFunction.fn(...args);
      sendResponse(200, { data: result });
    }
  });
};








exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware; exports.getRequestDetails = getRequestDetails; exports.getResponseDetails = getResponseDetails; exports.isExpressRequest = isExpressRequest; exports.isExpressResponse = isExpressResponse; exports.readBody = readBody;
