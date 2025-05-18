import {
  defaultMiddlewareOptions,
  defaultRPCOptions,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-EUSB4D3V.js";

// src/express/helpers.ts
import { Buffer } from "buffer";
import formidable from "formidable";
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"]?.toLowerCase() || "";
    if (contentType.includes("multipart/form-data")) {
      const form = formidable({ multiples: true });
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
          data: Buffer.concat(chunks)
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
  const middlewareHandler = async (req, res, next) => {
    const { url } = getRequestDetails(req);
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
    handler: async (req, res, next) => {
      const { url } = getRequestDetails(req);
      const { sendResponse } = getResponseDetails(res);
      const { rpcPreffix } = options;
      if (!url?.startsWith(`/${rpcPreffix}`)) {
        return next?.();
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

export {
  readBody,
  isExpressRequest,
  isExpressResponse,
  getRequestDetails,
  getResponseDetails,
  createMiddleware,
  createRPCMiddleware
};
