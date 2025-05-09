"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






var _chunkZLVHBACRcjs = require('./chunk-ZLVHBACR.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkZLVHBACRcjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    get pluginOptions() {
      return options;
    },
    async buildStart() {
      await _chunkZLVHBACRcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const result = await _vite.transformWithEsbuild.call(void 0, _chunkZLVHBACRcjs.getClientModules.call(void 0, options), id, {
        loader: "js",
        target: "es2020"
      });
      return {
        code: result.code,
        map: null
      };
    },
    configureServer(server) {
      viteServer = server;
      const { cors, csrf, ...rest } = options;
      if (cors) {
        server.middlewares.use(_chunkZLVHBACRcjs.createCors.call(void 0, cors));
      }
      if (csrf) {
        server.middlewares.use(_chunkZLVHBACRcjs.createCSRF.call(void 0, csrf));
      }
      server.middlewares.use(_chunkZLVHBACRcjs.createRPCMiddleware.call(void 0, rest));
    }
  };
}


exports.default = rpcPlugin;
