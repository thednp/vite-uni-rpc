"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






var _chunkM7KPJXHTcjs = require('./chunk-M7KPJXHT.cjs');

// src/index.ts
var _vite = require('vite');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
function rpcPlugin(initialOptions = {}) {
  const options = { ..._chunkM7KPJXHTcjs.defaultRPCOptions, ...initialOptions };
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
      await _chunkM7KPJXHTcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const result = await _vite.transformWithEsbuild.call(void 0, _chunkM7KPJXHTcjs.getClientModules.call(void 0, options), id, {
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
        server.middlewares.use(_chunkM7KPJXHTcjs.createCors.call(void 0, cors));
      }
      if (csrf) {
        server.middlewares.use(_chunkM7KPJXHTcjs.createCSRF.call(void 0, csrf));
      }
      server.middlewares.use(_chunkM7KPJXHTcjs.createRPCMiddleware.call(void 0, rest));
    }
  };
}
function defineConfig(config) {
  return _vite.mergeConfig.call(void 0, _chunkM7KPJXHTcjs.defaultRPCOptions, config);
}
async function loadRPCConfig(configFile) {
  try {
    const env = {
      command: "serve",
      mode: _process2.default.env.NODE_ENV || "development"
    };
    const defaultConfigFiles = [
      "rpc.config.ts",
      "rpc.config.js",
      "rpc.config.mjs",
      "rpc.config.mts",
      "rpc.config.cjs",
      "rpc.config.cts"
    ];
    if (configFile) {
      const result = await _vite.loadConfigFromFile.call(void 0, env, configFile);
      if (result) {
        return _vite.mergeConfig.call(void 0, _chunkM7KPJXHTcjs.defaultRPCOptions, result.config);
      }
    }
    for (const file of defaultConfigFiles) {
      const result = await _vite.loadConfigFromFile.call(void 0, env, file);
      if (result) {
        return _vite.mergeConfig.call(void 0, _chunkM7KPJXHTcjs.defaultRPCOptions, result.config);
      }
    }
    return _chunkM7KPJXHTcjs.defaultRPCOptions;
  } catch (error) {
    console.warn("Failed to load RPC config:", error);
    return _chunkM7KPJXHTcjs.defaultRPCOptions;
  }
}




exports.default = rpcPlugin; exports.defineConfig = defineConfig; exports.loadRPCConfig = loadRPCConfig;
