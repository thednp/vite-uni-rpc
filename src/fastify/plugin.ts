// src/fastify/plugin.ts
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { MiddlewareOptions } from "../types";
import { createMiddleware, createRPCMiddleware } from "./createMiddleware";

// Define the plugin function
const miniRpcPlugin = (
  fastify: FastifyInstance,
  initialOptions: Partial<MiddlewareOptions<"fastify">> = {},
  done: () => void,
) => {
  // Register regular middleware as preHandler hook
  const middleware = createMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () =>
      new Promise((resolve) => {
        middleware(request, reply, resolve);
      });
    await next();
  });

  // Register RPC middleware as preHandler hook
  const rpcMiddleware = createRPCMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () =>
      new Promise((resolve) => {
        rpcMiddleware(request, reply, resolve);
      });
    await next();
  });

  done();
};

// Export the plugin wrapped with fastify-plugin
const fastifyMiniRpcPlugin = fp(miniRpcPlugin, {
  name: "vite-mini-rpc-fastify-plugin",
});

export { fastifyMiniRpcPlugin as default };
