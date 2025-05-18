import {
  defaultMiddlewareOptions,
  defaultRPCOptions,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-CDDXHG4W.js";

// src/fastify/helpers.ts
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"]?.toLowerCase() || "";
    if (contentType.includes("json")) {
      resolve({
        contentType: "application/json",
        data: req.body
      });
      return;
    }
    let body = "";
    req.raw.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.raw.on("end", () => {
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
    ...defaultMiddlewareOptions,
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
  const middlewareHandler = async (req, reply, done) => {
    const reqUrl = new URL(req.url, "http://localhost");
    const url = reqUrl.pathname;
    if (serverFunctionsMap.size === 0) {
      await scanForServerFiles();
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
        if (!matcher.test(url || "")) {
          done();
          return;
        }
      }
      if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
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
  Object.defineProperty(middlewareHandler, "name", {
    value: name
  });
  return middlewareHandler;
};
var createRPCMiddleware = (initialOptions = {}) => {
  const options = {
    ...defaultMiddlewareOptions,
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions
  };
  return createMiddleware({
    ...options,
    handler: async (req, reply, done) => {
      const reqUrl = new URL(req.url, "http://localhost");
      const url = reqUrl.pathname;
      const { rpcPreffix } = options;
      if (!url?.startsWith(`/${rpcPreffix}`)) {
        done();
        return;
      }
      const functionName = url.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);
      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" was not found`
        });
        return;
      }
      try {
        const body = await readBody(req);
        const args = Array.isArray(body.data) ? body.data : [body.data];
        const result = await serverFunction.fn(void 0, ...args);
        reply.status(200).send({ data: result });
      } catch (err) {
        console.error(String(err));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
};

export {
  readBody,
  createMiddleware,
  createRPCMiddleware
};
