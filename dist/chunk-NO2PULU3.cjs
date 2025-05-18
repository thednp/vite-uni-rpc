"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunkMTFPKUGWcjs = require('./chunk-MTFPKUGW.cjs');

// src/express/helpers.ts
var _buffer = require('buffer');
var _formidable = require('formidable'); var _formidable2 = _interopRequireDefault(_formidable);
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = _optionalChain([req, 'access', _ => _.headers, 'access', _2 => _2["content-type"], 'optionalAccess', _3 => _3.toLowerCase, 'call', _4 => _4()]) || "";
    if (contentType.includes("multipart/form-data")) {
      const form = _formidable2.default.call(void 0, { multiples: true });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ contentType: "multipart/form-data", fields, files });
      });
      return;
    }
    let body = "";
    const chunks = [];
    req.on("data", (chunk) => {
      if (contentType.includes("octet-stream")) {
        chunks.push(chunk);
      } else {
        body += chunk.toString();
      }
    });
    req.on("end", () => {
      if (contentType.includes("octet-stream")) {
        resolve({
          contentType: "application/octet-stream",
          data: _buffer.Buffer.concat(chunks)
        });
        return;
      }
      if (contentType.includes("json")) {
        try {
          resolve({ contentType: "application/json", data: JSON.parse(body) });
        } catch (_e) {
          reject(new Error("Invalid JSON"));
        }
        return;
      }
      if (contentType.includes("urlencoded")) {
        const data = Object.fromEntries(new URLSearchParams(body));
        resolve({ contentType: "application/x-www-form-urlencoded", data });
        return;
      }
      resolve({ contentType: "text/plain", data: body });
    });
    req.on("error", reject);
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
    statusCode: response.statusCode,
    setStatusCode,
    sendResponse
  };
};

// src/express/createMiddleware.ts
var middlewareCount = 0;
var middleWareStack = /* @__PURE__ */ new Set();
var createMiddleware = (initialOptions = {}) => {
  const {
    name: middlewareName,
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError
  } = {
    ..._chunkMTFPKUGWcjs.defaultMiddlewareOptions,
    ...initialOptions
  };
  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }
  const middlewareHandler = async (req, res, next) => {
    const { url } = getRequestDetails(req);
    const { sendResponse, setHeader } = getResponseDetails(res);
    if (_chunkMTFPKUGWcjs.serverFunctionsMap.size === 0) {
      await _chunkMTFPKUGWcjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      return _optionalChain([next, 'optionalCall', _5 => _5()]);
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(url || "")) return _optionalChain([next, 'optionalCall', _6 => _6()]);
      }
      if (rpcPreffix && !_optionalChain([url, 'optionalAccess', _7 => _7.startsWith, 'call', _8 => _8(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _9 => _9()]);
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
      _optionalChain([next, 'optionalCall', _10 => _10()]);
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
  Object.defineProperty(middlewareHandler, "name", {
    value: name
  });
  return middlewareHandler;
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ..._chunkMTFPKUGWcjs.defaultMiddlewareOptions,
    rpcPreffix: _chunkMTFPKUGWcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, res, next) => {
      const { url } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!_optionalChain([url, 'optionalAccess', _11 => _11.startsWith, 'call', _12 => _12(`/${rpcPreffix}`)])) {
        return _optionalChain([next, 'optionalCall', _13 => _13()]);
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkMTFPKUGWcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        sendResponse(
          404,
          { error: `Function "${functionName}" not found` }
        );
        return;
      }
      try {
        const body = await readBody(req);
        let args;
        switch (body.contentType) {
          case "application/json":
            args = body.data;
            break;
          case "multipart/form-data":
            args = [body.fields, body.files];
            break;
          case "application/x-www-form-urlencoded":
            args = [body.data];
            break;
          case "application/octet-stream":
            args = [body.data];
            break;
          default:
            args = [body.data];
        }
        const result = await serverFunction.fn(...args);
        sendResponse(200, { data: result });
      } catch (err) {
        console.error(String(err));
        sendResponse(500, { error: "Internal Server Error" });
      }
    }
  });
};









exports.readBody = readBody; exports.isExpressRequest = isExpressRequest; exports.isExpressResponse = isExpressResponse; exports.getRequestDetails = getRequestDetails; exports.getResponseDetails = getResponseDetails; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
