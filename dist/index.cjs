"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








var _chunkI5XKGHB4cjs = require('./chunk-I5XKGHB4.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkI5XKGHB4cjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      _chunkI5XKGHB4cjs.serverFunctionsMap.clear();
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // config.command === "build" && process.env.MODE !== "production" ||
      _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      if (_chunkI5XKGHB4cjs.functionMappings.size === 0) {
        await _chunkI5XKGHB4cjs.scanForServerFiles.call(void 0, config, viteServer);
      }
      const transformedCode = `
// Client-side RPC modules
${Array.from(_chunkI5XKGHB4cjs.functionMappings.entries()).map(
        ([registeredName, exportName]) => _chunkI5XKGHB4cjs.getModule.call(void 0, registeredName, exportName, options)
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
      _chunkI5XKGHB4cjs.scanForServerFiles.call(void 0, config, server);
      server.middlewares.use(_chunkI5XKGHB4cjs.corsMiddleware);
      server.middlewares.use(_chunkI5XKGHB4cjs.csrfMiddleware);
      server.middlewares.use(_chunkI5XKGHB4cjs.rpcMiddleware);
    }
  };
}


exports.default = rpcPlugin;
