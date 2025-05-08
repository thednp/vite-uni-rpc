"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








var _chunk4LKJ3NGEcjs = require('./chunk-4LKJ3NGE.cjs');

// src/index.ts
var _vite = require('vite');

// src/midCors.ts
var corsMiddleware = _chunk4LKJ3NGEcjs.createCors.call(void 0, );

// src/midCSRF.ts
var csrfMiddleware = _chunk4LKJ3NGEcjs.createCSRF.call(void 0, );

// src/midRPC.ts
var rpcMiddleware = _chunk4LKJ3NGEcjs.createRPCMiddleware.call(void 0, );

// src/index.ts
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunk4LKJ3NGEcjs.defaultOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      _chunk4LKJ3NGEcjs.serverFunctionsMap.clear();
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // config.command === "build" && process.env.MODE !== "production" ||
      _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      if (_chunk4LKJ3NGEcjs.functionMappings.size === 0) {
        await _chunk4LKJ3NGEcjs.scanForServerFiles.call(void 0, config, viteServer);
      }
      const transformedCode = `
// Client-side RPC modules
${Array.from(_chunk4LKJ3NGEcjs.functionMappings.entries()).map(
        ([registeredName, exportName]) => _chunk4LKJ3NGEcjs.getModule.call(void 0, registeredName, exportName, options)
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
      _chunk4LKJ3NGEcjs.scanForServerFiles.call(void 0, config, server);
      server.middlewares.use(corsMiddleware);
      server.middlewares.use(csrfMiddleware);
      server.middlewares.use(rpcMiddleware);
    }
  };
}


exports.default = rpcPlugin;
