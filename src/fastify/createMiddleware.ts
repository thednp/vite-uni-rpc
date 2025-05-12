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

// Define the middleware function for Fastify
export const createMiddleware: FastifyMiddlewareFn = (initialOptions = {}) => {
  const {
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

// Create RPC middleware
export const createRPCMiddleware: FastifyMiddlewareFn = (
  initialOptions = {},
) => {
  const options = {
    ...defaultMiddlewareOptions,
    // RPC middleware needs to have the RPC prefix
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
      const pathname = url?.split("?")[0]; // Extract pathname without query params
      const { rpcPreffix } = options;

      if (!pathname?.startsWith(`/${rpcPreffix}`)) {
        done();
        return;
      }

      const functionName = pathname.replace(`/${rpcPreffix}/`, "");
      const serverFunction = serverFunctionsMap.get(functionName);

      if (!serverFunction) {
        reply.status(404).send({
          error: `Function "${functionName}" not found`,
        });
        return;
      }

      let args: Arguments[];
      try {
        // In Fastify, req.body is already parsed if the appropriate content-type parser is set
        args = (await req.body) as Arguments[] || [];
      } catch {
        args = [];
      }

      const result = await serverFunction.fn(...args) as JsonValue;
      reply.status(200).send({ data: result });
    },
  });
};
