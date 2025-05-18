// src/fastify/createMiddleware.ts
import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import { scanForServerFiles, serverFunctionsMap } from "../utils";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options";
import type { Arguments, JsonValue } from "../types";
import type { FastifyMiddlewareFn } from "./types";
import { readBody } from "./helpers";

let middlewareCount = 0;
const middleWareStack = new Set<string>();

// Define the middleware function for Fastify
export const createMiddleware: FastifyMiddlewareFn = (initialOptions = {}) => {
  const {
    name: middlewareName,
    rpcPreffix,
    path,
    headers,
    handler,
    onRequest,
    onResponse,
    onError,
  } = {
    ...defaultMiddlewareOptions,
    ...initialOptions,
  };

  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }

  return async (
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    // const { url } = req;
    const [pathname] = req.url.split("?"); // Extract pathname without query params

    // When serving from production server, scan for server files and populate the serverFunctionsMap
    if (serverFunctionsMap.size === 0) {
      await scanForServerFiles();
    }

    // No need to continue if no handler is provided
    if (!handler) {
      done();
      return;
    }

    try {
      // Execute onRequest hook if provided
      if (onRequest) {
        await onRequest(req);
      }

      // Path matching
      if (path) {
        const matcher = typeof path === "string" ? new RegExp(path) : path;
        if (!matcher.test(pathname || "")) {
          done();
          return;
        }
      }

      // rpcPreffix matching
      if (rpcPreffix && !pathname?.startsWith(`/${rpcPreffix}`)) {
        done();
        return;
      }

      // Set custom headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          reply.header(key, value);
        });
      }

      // Execute handler if provided
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
        await onError(error as Error, req, reply);
      } else {
        console.error("Middleware error:", String(error));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    }
  };
};

export const createRPCMiddleware: FastifyMiddlewareFn = (
  initialOptions = {},
) => {
  const options = {
    ...defaultMiddlewareOptions,
    rpcPreffix: defaultRPCOptions.rpcPreffix,
    ...initialOptions,
  };

  return createMiddleware({
    ...options,
    handler: async (
      req: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction,
    ) => {
      const { url } = req;
      const pathname = url?.split("?")[0];
      const { rpcPreffix } = options;

      if (!pathname?.startsWith(`/${rpcPreffix}`)) {
        done();
        return;
      }

      const functionName = pathname.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" was not found`,
        });
        return;
      }

      try {
        const body = await readBody(req);
        let args: Arguments[];

        switch (body.contentType) {
          case "application/json":
            args = body.data as Arguments[];
            break;
          case "multipart/form-data":
            args = [body.fields, body.files] as Arguments[];
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

        const result = await serverFunction.fn(...args) as JsonValue;
        reply.status(200).send({ data: result });
      } catch (err) {
        console.error(String(err));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    },
  });
};
