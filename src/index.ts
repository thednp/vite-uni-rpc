import type { ConfigEnv, Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import process from "node:process";
import { getClientModules, scanForServerFiles } from "./utils";
import { defaultRPCOptions } from "./options";
import { createCors } from "./createCors";
import { createCSRF } from "./createCSRF";
import { createRPCMiddleware } from "./createMid";
import type { RpcPluginOptions } from "./types";

function rpcPlugin(
  initialOptions: Partial<RpcPluginOptions> = {},
): Plugin {
  const options = { ...defaultRPCOptions, ...initialOptions };
  let config: ResolvedConfig;
  let viteServer: ViteDevServer;

  return {
    name: "vite-mini-rpc",
    enforce: "pre",
    // Plugin methods
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      // Prepare the server functions
      await scanForServerFiles(config, viteServer);
    },
    async transform(code: string, id: string, ops?: { ssr?: boolean }) {
      // Only transform files with server functions for client builds
      if (
        !code.includes("createServerFunction") ||
        ops?.ssr
      ) {
        return null;
      }

      const result = await transformWithEsbuild(getClientModules(options), id, {
        loader: "js",
        target: "es2020",
      });

      return {
        code: result.code,
        map: null,
      };
    },

    configureServer(server) {
      viteServer = server;
      const { cors, csrf, ...rest } = options;

      // First register CORS middleware
      if (cors) {
        server.middlewares.use(createCors(cors));
      }

      // Then register CSRF token middleware
      if (csrf) {
        server.middlewares.use(createCSRF(csrf));
      }

      // Lastly, handle RPC calls
      server.middlewares.use(createRPCMiddleware(rest));
    },
  };
}

/**
 * Utility to define `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
function defineRPCConfig(config: Partial<RpcPluginOptions>) {
  return mergeConfig(defaultRPCOptions, config) as RpcPluginOptions;
}

/**
 * Utility to load `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
async function loadRPCConfig(configFile?: string) {
  try {
    const env: ConfigEnv = {
      command: "serve",
      mode: process.env.NODE_ENV || "development",
    };
    const defaultConfigFiles = [
      "rpc.config.ts",
      "rpc.config.js",
      "rpc.config.mjs",
      "rpc.config.mts",
      "rpc.config.cjs",
      "rpc.config.cts",
    ];

    // If specific config file provided
    if (configFile) {
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        return mergeConfig(defaultRPCOptions, result.config);
      }
    }

    // Try default config files
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

export { defineRPCConfig, loadRPCConfig, type RpcPluginOptions };
export { rpcPlugin as default };

export {};
