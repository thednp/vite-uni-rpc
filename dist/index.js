import {
  createCSRF,
  createCors,
  createRPCMiddleware,
  defaultRPCOptions,
  getClientModules,
  scanForServerFiles
} from "./chunk-UVTBKHHN.js";

// src/index.ts
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import process from "node:process";
function rpcPlugin(initialOptions = {}) {
  const options = { ...defaultRPCOptions, ...initialOptions };
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
      await scanForServerFiles(config, viteServer);
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || ops?.ssr) {
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
      const { cors, csrf, ...rest } = options;
      if (cors) {
        server.middlewares.use(createCors(cors));
      }
      if (csrf) {
        server.middlewares.use(createCSRF(csrf));
      }
      server.middlewares.use(createRPCMiddleware(rest));
    }
  };
}
function defineConfig(config) {
  return mergeConfig(defaultRPCOptions, config);
}
async function loadRPCConfig(configFile) {
  try {
    const env = {
      command: "serve",
      mode: process.env.NODE_ENV || "development"
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
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        return mergeConfig(defaultRPCOptions, result.config);
      }
    }
    for (const file of defaultConfigFiles) {
      const result = await loadConfigFromFile(env, file);
      if (result) {
        return mergeConfig(defaultRPCOptions, result.config);
      }
    }
    return defaultRPCOptions;
  } catch (error) {
    console.warn("Failed to load RPC config:", error);
    return defaultRPCOptions;
  }
}
export {
  rpcPlugin as default,
  defineConfig,
  loadRPCConfig
};
