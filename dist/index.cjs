"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








var _chunkJP7WE3WMcjs = require('./chunk-JP7WE3WM.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkJP7WE3WMcjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    // Plugin methods
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      await _chunkJP7WE3WMcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const result = await _vite.transformWithEsbuild.call(void 0, _chunkJP7WE3WMcjs.getClientModules.call(void 0, options), id, {
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
        server.middlewares.use(_chunkJP7WE3WMcjs.createCors.call(void 0, cors));
      }
      if (csrf) {
        server.middlewares.use(_chunkJP7WE3WMcjs.createCSRF.call(void 0, csrf));
      }
      server.middlewares.use(_chunkJP7WE3WMcjs.createRPCMiddleware.call(void 0, rest));
    }
  };
}




exports.default = rpcPlugin; exports.defineRPCConfig = _chunkJP7WE3WMcjs.defineRPCConfig; exports.loadRPCConfig = _chunkJP7WE3WMcjs.loadRPCConfig;
