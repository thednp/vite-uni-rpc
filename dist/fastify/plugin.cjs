"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }


var _chunkGHYXWV4Zcjs = require('../chunk-GHYXWV4Z.cjs');
require('../chunk-I745QCC6.cjs');

// src/fastify/plugin.ts
var _fastifyplugin = require('fastify-plugin'); var _fastifyplugin2 = _interopRequireDefault(_fastifyplugin);
var miniRpcPlugin = (fastify, initialOptions = {}, done) => {
  if (initialOptions.path && initialOptions.rpcPreffix) {
    console.warn(
      "Configuration conflict: Both 'path' and 'rpcPreffix' are provided. The middleware expects either 'path' for general middleware or 'rpcPreffix' for RPC middleware, but not both. Skipping middleware registration."
    );
    done();
    return;
  }
  const middleware = _chunkGHYXWV4Zcjs.createMiddleware.call(void 0, initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      middleware(request, reply, resolve);
    });
    await next();
  });
  const rpcMiddleware = _chunkGHYXWV4Zcjs.createRPCMiddleware.call(void 0, initialOptions);
  fastify.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      rpcMiddleware(request, reply, resolve);
    });
    await next();
  });
  done();
};
var fastifyMiniRpcPlugin = _fastifyplugin2.default.call(void 0, miniRpcPlugin, {
  name: "vite-mini-rpc-fastify-plugin"
});


exports.default = fastifyMiniRpcPlugin;
