"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




var _chunkMTFPKUGWcjs = require('./chunk-MTFPKUGW.cjs');

// src/fastify/helpers.ts
var _buffer = require('buffer');
var _formidable = require('formidable'); var _formidable2 = _interopRequireDefault(_formidable);
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = _optionalChain([req, 'access', _ => _.headers, 'access', _2 => _2["content-type"], 'optionalAccess', _3 => _3.toLowerCase, 'call', _4 => _4()]) || "";
    if (contentType.includes("multipart/form-data")) {
      const form = _formidable2.default.call(void 0, { multiples: true });
      form.parse(req.raw, (err, fields, files) => {
        if (err) return reject(err);
        resolve({
          contentType: "multipart/form-data",
          fields,
          files
        });
      });
      return;
    }
    let body = "";
    const chunks = [];
    req.raw.on("data", (chunk) => {
      if (contentType.includes("octet-stream")) {
        chunks.push(chunk);
      } else {
        body += chunk.toString();
      }
    });
    req.raw.on("end", () => {
      if (contentType.includes("octet-stream")) {
        resolve({
          contentType: "application/octet-stream",
          data: _buffer.Buffer.concat(chunks)
        });
        return;
      }
      if (contentType.includes("json")) {
        try {
          resolve({
            contentType: "application/json",
            data: JSON.parse(body)
          });
        } catch (_e) {
          reject(new Error("Invalid JSON"));
        }
        return;
      }
      if (contentType.includes("urlencoded")) {
        resolve({
          contentType: "application/x-www-form-urlencoded",
          data: Object.fromEntries(new URLSearchParams(body))
        });
        return;
      }
      resolve({ contentType: "text/plain", data: body });
    });
    req.raw.on("error", reject);
  });
};

// src/fastify/createMiddleware.ts
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
  return async (req, reply, done) => {
    const [pathname] = req.url.split("?");
    if (_chunkMTFPKUGWcjs.serverFunctionsMap.size === 0) {
      await _chunkMTFPKUGWcjs.scanForServerFiles.call(void 0, );
    }
    if (!handler) {
      done();
      return;
    }
    try {
      if (onRequest) {
        await onRequest(req);
      }
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(pathname || "")) {
          done();
          return;
        }
      }
      if (rpcPreffix && !_optionalChain([pathname, 'optionalAccess', _5 => _5.startsWith, 'call', _6 => _6(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          reply.header(key, value);
        });
      }
      if (handler) {
        await handler(req, reply, done);
        if (onResponse) {
          await onResponse(reply);
        }
        return;
      }
      done();
    } catch (error) {
      if (onResponse) {
        await onResponse(reply);
      }
      if (onError) {
        await onError(error, req, reply);
      } else {
        console.error("Middleware error:", String(error));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  };
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ..._chunkMTFPKUGWcjs.defaultMiddlewareOptions,
    rpcPreffix: _chunkMTFPKUGWcjs.defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, reply, done) => {
      const { url } = req;
      const pathname = _optionalChain([url, 'optionalAccess', _7 => _7.split, 'call', _8 => _8("?"), 'access', _9 => _9[0]]);
      const { rpcPreffix } = options;
      if (!_optionalChain([pathname, 'optionalAccess', _10 => _10.startsWith, 'call', _11 => _11(`/${rpcPreffix}`)])) {
        done();
        return;
      }
      const functionName = pathname.replace(`/${rpcPreffix}/`, "");
      const serverFunction = _chunkMTFPKUGWcjs.serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" was not found`
        });
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
        reply.status(200).send({ data: result });
      } catch (err) {
        console.error(String(err));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
};





exports.readBody = readBody; exports.createMiddleware = createMiddleware; exports.createRPCMiddleware = createRPCMiddleware;
