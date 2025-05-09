"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







var _chunkWFDYUAHDcjs = require('./chunk-WFDYUAHD.cjs');

// src/index.ts
var _vite = require('vite');
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkWFDYUAHDcjs.defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      await _chunkWFDYUAHDcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const transformedCode = `
// Client-side RPC modules
const handleResponse = (response) => {
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
${Array.from(_chunkWFDYUAHDcjs.functionMappings.entries()).map(
        ([registeredName, exportName]) => _chunkWFDYUAHDcjs.getModule.call(void 0, registeredName, exportName, options)
      ).join("\n")}
`.trim();
      const result = await _vite.transformWithEsbuild.call(void 0, transformedCode, id, {
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
        server.middlewares.use(_chunkWFDYUAHDcjs.createCors.call(void 0, cors));
      }
      if (csrf) {
        server.middlewares.use(_chunkWFDYUAHDcjs.createCSRF.call(void 0, csrf));
      }
      server.middlewares.use(_chunkWFDYUAHDcjs.createRPCMiddleware.call(void 0, rest));
    }
  };
}


exports.default = rpcPlugin;
