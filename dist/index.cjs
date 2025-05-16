"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

var _chunkZZPN4IYXcjs = require('./chunk-ZZPN4IYX.cjs');




var _chunkFIWPANLAcjs = require('./chunk-FIWPANLA.cjs');

// src/index.ts
var _vite = require('vite');
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var _fs = require('fs');
var defineConfig = (uniConfig) => {
  return _vite.mergeConfig.call(void 0, _chunkFIWPANLAcjs.defaultRPCOptions, uniConfig);
};
async function loadRPCConfig(configFile) {
  try {
    const env = {
      command: "serve",
      root: _process2.default.cwd(),
      mode: _process2.default.env.NODE_ENV || "development"
    };
    const defaultConfigFiles = [
      "rpc.config.ts",
      "rpc.config.js",
      "rpc.config.mjs",
      "rpc.config.mts",
      ".rpcrc.ts",
      ".rpcrc.js"
    ];
    if (configFile) {
      if (!_fs.existsSync.call(void 0, _path.resolve.call(void 0, env.root, configFile))) {
        console.warn(
          `\u2139\uFE0F  The specified RPC config file "${configFile}" cannot be found, loading the defaults..`
        );
        return _chunkFIWPANLAcjs.defaultRPCOptions;
      }
      const result = await _vite.loadConfigFromFile.call(void 0, env, configFile);
      if (result) {
        console.log(
          `\u2705  Succesfully loaded RPC config from your "${configFile}" file!`
        );
        return _vite.mergeConfig.call(void 0, 
          _chunkFIWPANLAcjs.defaultRPCOptions,
          result.config
        );
      }
      return _chunkFIWPANLAcjs.defaultRPCOptions;
    }
    for (const file of defaultConfigFiles) {
      if (!_fs.existsSync.call(void 0, _path.resolve.call(void 0, env.root, file))) {
        continue;
      }
      const result = await _vite.loadConfigFromFile.call(void 0, env, file);
      if (result) {
        console.log(`\u2705  Succesfully loaded RPC config from "${file}" file!`);
        return _vite.mergeConfig.call(void 0, 
          _chunkFIWPANLAcjs.defaultRPCOptions,
          result.config
        );
      }
    }
    console.warn("\u2139\uFE0F  No RPC config found, loading the defaults..");
    return _chunkFIWPANLAcjs.defaultRPCOptions;
  } catch (error) {
    console.warn("\u26A0\uFE0F  Failed to load RPC config:", error);
    return _chunkFIWPANLAcjs.defaultRPCOptions;
  }
}
async function rpcPlugin(devOptions = {}) {
  const uniConfig = await loadRPCConfig();
  const options = _vite.mergeConfig.call(void 0, uniConfig, devOptions);
  let config;
  let viteServer;
  return {
    name: "vite-uni-rpc",
    enforce: "pre",
    // Plugin methods
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      await _chunkFIWPANLAcjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || _optionalChain([ops, 'optionalAccess', _ => _.ssr])) {
        return null;
      }
      const result = await _vite.transformWithEsbuild.call(void 0, _chunkFIWPANLAcjs.getClientModules.call(void 0, options), id, {
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
      const { adapter: _adapter, ...rest } = options;
      server.middlewares.use(
        _chunkZZPN4IYXcjs.createRPCMiddleware.call(void 0, rest)
      );
    }
  };
}




exports.default = rpcPlugin; exports.defineConfig = defineConfig; exports.loadRPCConfig = loadRPCConfig;
