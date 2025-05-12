import type {
  ConfigEnv,
  Connect,
  Plugin,
  ResolvedConfig,
  ViteDevServer,
} from "vite";
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import { resolve } from "node:path";
import process from "node:process";
import { existsSync } from "node:fs";
import { getClientModules, scanForServerFiles } from "./utils";
import { createRPCMiddleware } from "./express/createMiddleware";
import { defaultRPCOptions } from "./options";
import type { RpcPluginOptions } from "./types";

/**
 * Utility to define `vite-mini-rpc` configuration file similar to vite.
 * @param uniConfig a system wide RPC configuration
 */
const defineConfig = (uniConfig: Partial<RpcPluginOptions>) => {
  return mergeConfig(defaultRPCOptions, uniConfig) as RpcPluginOptions;
};

/**
 * Utility to load `vite-mini-rpc` configuration file system wide.
 * @param configFile an optional parameter to specify a file within your project scope
 */
async function loadRPCConfig(configFile?: string) {
  try {
    const env: ConfigEnv & { root: string } = {
      command: "serve",
      root: process.cwd(),
      mode: process.env.NODE_ENV || "development",
    };
    const defaultConfigFiles = [
      "rpc.config.ts",
      "rpc.config.js",
      "rpc.config.mjs",
      "rpc.config.mts",
      ".rpcrc.ts",
      ".rpcrc.js",
    ];

    // If specific config file provided
    if (configFile) {
      if (!existsSync(resolve(env.root, configFile))) {
        console.warn(
          `ℹ️  The specified RPC config file "${configFile}" cannot be found, loading the defaults..`,
        );
        return defaultRPCOptions as RpcPluginOptions;
      }
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        console.log(
          `✅  Succesfully loaded RPC config from your "${configFile}" file!`,
        );

        return mergeConfig(
          defaultRPCOptions,
          result.config,
        ) as RpcPluginOptions;
      }
      return defaultRPCOptions as RpcPluginOptions;
    }

    // Try default config files
    for (const file of defaultConfigFiles) {
      if (!existsSync(resolve(env.root, file))) {
        continue;
      }
      const result = await loadConfigFromFile(env, file);
      if (result) {
        console.log(`✅  Succesfully loaded RPC config from "${file}" file!`);
        return mergeConfig(
          defaultRPCOptions,
          result.config,
        ) as RpcPluginOptions;
      }
    }
    // Last call load defaults no matter what
    console.warn("ℹ️  No RPC config found, loading the defaults..");
    return defaultRPCOptions as RpcPluginOptions;
  } catch (error) {
    console.warn("⚠️  Failed to load RPC config:", error);
    return defaultRPCOptions as RpcPluginOptions;
  }
}

async function rpcPlugin(
  devOptions: Partial<RpcPluginOptions> = {},
): Promise<Plugin> {
  const uniConfig = await loadRPCConfig();
  const options = mergeConfig(uniConfig, devOptions) as RpcPluginOptions;
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
      const { adapter: _adapter, ...rest } = options;
      // in dev mode we always use express/connect adapter
      server.middlewares.use(
        createRPCMiddleware(rest) as Connect.NextHandleFunction,
      );
    },
  };
}

export { defineConfig, loadRPCConfig, type RpcPluginOptions };
export { rpcPlugin as default };

export {};
