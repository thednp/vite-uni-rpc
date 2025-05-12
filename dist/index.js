import {
  defaultRPCOptions,
  getClientModules,
  scanForServerFiles
} from "./chunk-Z66NX36T.js";

// src/index.ts
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var defineConfig = (uniConfig) => {
  return mergeConfig(defaultRPCOptions, uniConfig);
};
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
      ".rpcrc.ts",
      ".rpcrc.js"
    ];
    if (configFile) {
      if (!existsSync(resolve(__dirname, configFile))) {
        console.warn(
          `\u2139\uFE0F  The specified RPC config file "${configFile}" cannot be found, loading the defaults..`
        );
        return defaultRPCOptions;
      }
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        console.log(
          `\u2705  Succesfully loaded RPC config from your "${configFile}" file!`
        );
        return mergeConfig(
          defaultRPCOptions,
          result.config
        );
      }
      return defaultRPCOptions;
    }
    for (const file of defaultConfigFiles) {
      if (!existsSync(resolve(__dirname, file))) {
        continue;
      }
      const result = await loadConfigFromFile(env, file);
      if (result) {
        console.log(`\u2705  Succesfully loaded RPC config from "${file}" file!`);
        return mergeConfig(
          defaultRPCOptions,
          result.config
        );
      }
    }
    console.warn("\u2139\uFE0F  No RPC config found, loading the defaults..");
    return defaultRPCOptions;
  } catch (error) {
    console.warn("\u26A0\uFE0F  Failed to load RPC config:", error);
    return defaultRPCOptions;
  }
}
async function rpcPlugin(devOptions = {}) {
  const uniConfig = await loadRPCConfig();
  const options = mergeConfig(uniConfig, devOptions);
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
    async configureServer(server) {
      viteServer = server;
      const { adapter, ...rest } = options;
      const adaptersMap = {
        express: "vite-mini-rpc/express",
        fastify: "vite-mini-rpc/fastify",
        hono: "vite-mini-rpc/hono"
      };
      const { createRPCMiddleware } = await import(adaptersMap[adapter]);
      server.middlewares.use(createRPCMiddleware(rest));
    }
  };
}
export {
  rpcPlugin as default,
  defineConfig,
  loadRPCConfig
};
