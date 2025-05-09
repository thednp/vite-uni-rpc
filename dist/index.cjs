"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








var _chunkE2GKRBMVcjs = require('./chunk-E2GKRBMV.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkE2GKRBMVcjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      _chunkE2GKRBMVcjs.serverFunctionsMap.clear();
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // config.command === "build" && process.env.MODE !== "production" ||
      _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      if (_chunkE2GKRBMVcjs.functionMappings.size === 0) {
        await _chunkE2GKRBMVcjs.scanForServerFiles.call(void 0, config, viteServer);
      }
      const transformedCode = `
// Client-side RPC modules
${Array.from(_chunkE2GKRBMVcjs.functionMappings.entries()).map(
        ([registeredName, exportName]) => _chunkE2GKRBMVcjs.getModule.call(void 0, registeredName, exportName, options)
      ).join("\n")}
`.trim();
      const result = await _vite.transformWithEsbuild.call(void 0, transformedCode, id, {
        loader: "js",
        target: "es2020"
      });
      return {
        // code: transformedCode,
        code: result.code,
        map: null
      };
    },
    configureServer(server) {
      viteServer = server;
      _chunkE2GKRBMVcjs.scanForServerFiles.call(void 0, config, server);
      server.middlewares.use(_chunkE2GKRBMVcjs.corsMiddleware);
      server.middlewares.use(_chunkE2GKRBMVcjs.csrfMiddleware);
      server.middlewares.use(_chunkE2GKRBMVcjs.rpcMiddleware);
    }
  };
}


exports.default = rpcPlugin;
