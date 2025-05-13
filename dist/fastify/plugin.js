import {
  createMiddleware,
  createRPCMiddleware
} from "../chunk-OUYNNQLO.js";
import "../chunk-LQUDPDUK.js";

// src/fastify/plugin.ts
import fp from "fastify-plugin";
var miniRpcPlugin = (fastify, initialOptions = {}, done) => {
  if (initialOptions.path && initialOptions.rpcPreffix) {
    console.warn(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration."
    );
    done();
    return;
  }
  const middleware = createMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      middleware(request, reply, resolve);
    });
    await next();
  });
  const rpcMiddleware = createRPCMiddleware(initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      rpcMiddleware(request, reply, resolve);
    });
    await next();
  });
  done();
};
var fastifyMiniRpcPlugin = fp(miniRpcPlugin, {
  name: "vite-mini-rpc-fastify-plugin"
});
export {
  fastifyMiniRpcPlugin as default
};
