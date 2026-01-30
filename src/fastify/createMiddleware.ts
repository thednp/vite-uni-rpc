// src/fastify/createMiddleware.ts
import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
// import { scanForServerFiles } from "vite-uni-rpc/server";
import { serverFunctionsMap, scanForServerFiles } from "vite-uni-rpc/server";
import type { ServerFunction } from "vite-uni-rpc";
import { defaultMiddlewareOptions, defaultRPCOptions } from "../options.ts";
import type {
  FastifyMiddlewareFn,
  FastifyMiddlewareOptions,
} from "./types.d.ts";
import { readBody } from "./helpers.ts";

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
  } = Object.assign(
    {},
    defaultMiddlewareOptions,
    initialOptions,
  ) as FastifyMiddlewareOptions;

  let name = middlewareName;
  if (!name) {
    name = "viteRPCMiddleware-" + middlewareCount;
    middlewareCount += 1;
  }
  if (middleWareStack.has(name)) {
    throw new Error(`The middleware name "${name}" is already used.`);
  }

  const middlewareHandler = async (
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    const reqUrl = new URL(req.url, "http://localhost");
    const url = reqUrl.pathname;

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
        if (!matcher.test(url || "")) {
          done();
          return;
        }
      }

      // rpcPreffix matching
      if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
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

  Object.defineProperty(middlewareHandler, "name", {
    value: name,
  });

  return middlewareHandler;
};

export const createRPCMiddleware: FastifyMiddlewareFn = (
  initialOptions = {},
) => {
  const options = Object.assign(
    {},
    defaultMiddlewareOptions,
    { rpcPreffix: defaultRPCOptions.rpcPreffix },
    initialOptions,
  ) as FastifyMiddlewareOptions;

  return createMiddleware({
    ...options,
    handler: async (
      req: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction,
    ) => {
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
          error: `Function "${functionName}" was not found`,
        });
        return;
      }

      try {
        const body = await readBody(req);
        const controller = new AbortController();
        req.raw.on("close", () => controller.abort());
        req.raw.on("error", () => controller.abort());
        const args = Array.isArray(body.data) ? body.data : [body.data];
        const data = await // the plugin will do the switcharoo
        (serverFunction.fn as unknown as ServerFunction)(
          controller.signal,
          ...args,
        );
        // TO DO: HANDLE cancel + Abort signal
        reply.status(200).send({ data });
      } catch (err) {
        console.error(String(err));
        reply.status(500).send({ error: "Internal Server Error" });
      }
    },
  });
};
