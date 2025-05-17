import {
  createRPCMiddleware
} from "./chunk-RCGVWQPS.js";
import {
  defaultRPCOptions,
  getClientModules,
  scanForServerFiles
} from "./chunk-GSKE4CT4.js";

// src/index.ts
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import colors from "picocolors";
import { resolve } from "node:path";
import process from "node:process";
import { existsSync } from "node:fs";
var defineConfig = (uniConfig) => {
  return mergeConfig(defaultRPCOptions, uniConfig);
};
var RPCConfig;
async function loadRPCConfig(configFile) {
  try {
    const env = {
      command: "serve",
      root: process.cwd(),
      mode: process.env.NODE_ENV || "development"
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
      const configFilePath = resolve(env.root, configFile);
      if (!existsSync(configFilePath)) {
        console.warn(
          `  ${colors.redBright("\u26A0\uFE0E")} The specified RPC config file ${colors.redBright(colors.bold(configFile))} cannot be found, loading the defaults..`
        );
        RPCConfig = defaultRPCOptions;
        return defaultRPCOptions;
      }
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        console.log(
          `  ${colors.yellow("\u26A1\uFE0E")} Succesfully loaded your ${colors.green(colors.bold(configFile))} file!`
        );
        RPCConfig = mergeConfig(
          {
            ...defaultRPCOptions,
            configFile: configFilePath
          },
          result.config
        );
        return RPCConfig;
      }
      RPCConfig = defaultRPCOptions;
      return RPCConfig;
    }
    if (RPCConfig !== void 0) {
      return RPCConfig;
    }
    for (const file of defaultConfigFiles) {
      const configFilePath = resolve(env.root, file);
      if (!existsSync(configFilePath)) {
        continue;
      }
      const result = await loadConfigFromFile(env, file);
      if (result) {
        RPCConfig = mergeConfig(
          {
            ...defaultRPCOptions,
            configFile: configFilePath
          },
          result.config
        );
        console.log(
          `  ${colors.yellow("\u26A1\uFE0E")} Succesfully loaded ${colors.green(colors.bold(file))} file`
        );
        return RPCConfig;
      }
    }
    console.warn(
      `  ${colors.yellow("\u26A1\uFE0E")} No RPC config found, loading the defaults..`
    );
    return defaultRPCOptions;
  } catch (error) {
    console.warn(
      `  ${colors.redBright("\u26A0\uFE0E")} Failed to load RPC config:`,
      error
    );
    return defaultRPCOptions;
  }
}
async function rpcPlugin(devOptions = {}) {
  const uniConfig = await loadRPCConfig();
  const options = mergeConfig(uniConfig, devOptions);
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
      await scanForServerFiles(config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // any other file is unchanged
      ops?.ssr || // file loaded on server remains unchanged
      code.includes("createServerFunction") && typeof process === "undefined") {
        return null;
      }
      const result = await transformWithEsbuild(getClientModules(options), id, {
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
        createRPCMiddleware(rest)
      );
    }
  };
}
export {
  rpcPlugin as default,
  defineConfig,
  loadRPCConfig
};
