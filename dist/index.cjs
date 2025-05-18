"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

var _chunkA67NPGSQcjs = require('./chunk-A67NPGSQ.cjs');




var _chunk2P4UAVG6cjs = require('./chunk-2P4UAVG6.cjs');

// src/index.ts
var _vite = require('vite');
var _picocolors = require('picocolors'); var _picocolors2 = _interopRequireDefault(_picocolors);
var _path = require('path');
var _process = require('process'); var _process2 = _interopRequireDefault(_process);
var _fs = require('fs');
var defineConfig = (uniConfig) => {
  return _vite.mergeConfig.call(void 0, _chunk2P4UAVG6cjs.defaultRPCOptions, uniConfig);
};
var RPCConfig;
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
      const configFilePath = _path.resolve.call(void 0, env.root, configFile);
      if (!_fs.existsSync.call(void 0, configFilePath)) {
        console.warn(
          `  ${_picocolors2.default.redBright("\u26A0\uFE0E")} The specified RPC config file ${_picocolors2.default.redBright(_picocolors2.default.bold(configFile))} cannot be found, loading the defaults..`
        );
        RPCConfig = _chunk2P4UAVG6cjs.defaultRPCOptions;
        return _chunk2P4UAVG6cjs.defaultRPCOptions;
      }
      const result = await _vite.loadConfigFromFile.call(void 0, env, configFile);
      if (result) {
        console.log(
          `  ${_picocolors2.default.yellow("\u26A1\uFE0E")} Succesfully loaded your ${_picocolors2.default.green(_picocolors2.default.bold(configFile))} file!`
        );
        RPCConfig = _vite.mergeConfig.call(void 0, 
          {
            ..._chunk2P4UAVG6cjs.defaultRPCOptions,
            configFile: configFilePath
          },
          result.config
        );
        return RPCConfig;
      }
      RPCConfig = _chunk2P4UAVG6cjs.defaultRPCOptions;
      return RPCConfig;
    }
    if (RPCConfig !== void 0) {
      return RPCConfig;
    }
    for (const file of defaultConfigFiles) {
      const configFilePath = _path.resolve.call(void 0, env.root, file);
      if (!_fs.existsSync.call(void 0, configFilePath)) {
        continue;
      }
      const result = await _vite.loadConfigFromFile.call(void 0, env, file);
      if (result) {
        RPCConfig = _vite.mergeConfig.call(void 0, 
          {
            ..._chunk2P4UAVG6cjs.defaultRPCOptions,
            configFile: configFilePath
          },
          result.config
        );
        console.log(
          `  ${_picocolors2.default.yellow("\u26A1\uFE0E")} Succesfully loaded ${_picocolors2.default.green(_picocolors2.default.bold(file))} file`
        );
        return RPCConfig;
      }
    }
    console.warn(
      `  ${_picocolors2.default.yellow("\u26A1\uFE0E")} No RPC config found, loading the defaults..`
    );
    return _chunk2P4UAVG6cjs.defaultRPCOptions;
  } catch (error) {
    console.warn(
      `  ${_picocolors2.default.redBright("\u26A0\uFE0E")} Failed to load RPC config:`,
      error
    );
    return _chunk2P4UAVG6cjs.defaultRPCOptions;
  }
}
function rpcPlugin(devOptions = {}) {
  let options;
  let config;
  let viteServer;
  return {
    name: "vite-uni-rpc",
    enforce: "pre",
    // Plugin methods
    async configResolved(resolvedConfig) {
      const uniConfig = await loadRPCConfig();
      options = _vite.mergeConfig.call(void 0, uniConfig, devOptions);
      config = resolvedConfig;
    },
    async buildStart() {
      await _chunk2P4UAVG6cjs.scanForServerFiles.call(void 0, config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // any other file is unchanged
      _optionalChain([ops, 'optionalAccess', _ => _.ssr]) || // file loaded on server remains unchanged
      code.includes("createServerFunction") && typeof _process2.default === "undefined") {
        return null;
      }
      const result = await _vite.transformWithEsbuild.call(void 0, _chunk2P4UAVG6cjs.getClientModules.call(void 0, options), id, {
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
        _chunkA67NPGSQcjs.createRPCMiddleware.call(void 0, rest)
      );
    }
  };
}




exports.default = rpcPlugin; exports.defineConfig = defineConfig; exports.loadRPCConfig = loadRPCConfig;
