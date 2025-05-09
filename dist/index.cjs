"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







var _chunkSXL2KUCDcjs = require('./chunk-SXL2KUCD.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkSXL2KUCDcjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      await _chunkSXL2KUCDcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const transformedCode = `
// Client-side RPC modules
${Array.from(_chunkSXL2KUCDcjs.functionMappings.entries()).map(
        ([registeredName, exportName]) => _chunkSXL2KUCDcjs.getModule.call(void 0, registeredName, exportName, options)
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
      server.middlewares.use(_chunkSXL2KUCDcjs.corsMiddleware);
      server.middlewares.use(_chunkSXL2KUCDcjs.csrfMiddleware);
      server.middlewares.use(_chunkSXL2KUCDcjs.rpcMiddleware);
    }
  };
}


exports.default = rpcPlugin;
