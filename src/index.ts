import type {
  ConfigEnv,
  // Plugin,
  PluginOption,
  ResolvedConfig,
  // UserConfig,
  ViteDevServer,
} from "vite";
import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import colors from "picocolors";
import { resolve } from "node:path";
import process from "node:process";
import { existsSync } from "node:fs";
// import { getClientModules } from "./utils.ts";
import { createRPCMiddleware } from "./express/createMiddleware.ts";
// import { createRPCMiddleware } from "vite-uni-rpc/express";
import { defaultRPCOptions } from "./options.ts";
import type { RpcPluginOptions } from "./types.d.ts";

import {
  scanForServerFiles,
  serverFunctionsMap,
  getClientModules,
} from "vite-uni-rpc/server";

/**
 * Utility to define `vite-uni-rpc` configuration file similar to vite.
 * @param uniConfig a system wide RPC configuration
 */
const defineConfig = (uniConfig: Partial<RpcPluginOptions>) => {
  return mergeConfig(defaultRPCOptions, uniConfig) as RpcPluginOptions;
};

let RPCConfig: RpcPluginOptions;

/**
 * Utility to load `vite-uni-rpc` configuration file system wide.
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
      const configFilePath = resolve(env.root, configFile);
      if (!existsSync(configFilePath)) {
        console.warn(
          `  ${colors.redBright("⚠︎")} The specified RPC config file ${colors.redBright(
            colors.bold(configFile),
          )} cannot be found, loading the defaults..`,
        );
        RPCConfig = defaultRPCOptions;
        return defaultRPCOptions as RpcPluginOptions;
      }

      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        console.log(
          `  ${colors.yellow("⚡︎")} Succesfully loaded your ${colors.green(
            colors.bold(configFile),
          )} file!`,
        );
        RPCConfig = mergeConfig(
          {
            ...defaultRPCOptions,
            configFile: configFilePath,
          },
          result.config,
        ) as RpcPluginOptions;

        return RPCConfig;
      }
      RPCConfig = defaultRPCOptions;
      return RPCConfig;
    }

    if (RPCConfig !== undefined) {
      return RPCConfig;
    }

    // Try default config files
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
            configFile: configFilePath,
          },
          result.config,
        ) as RpcPluginOptions;
        console.log(
          `  ${colors.yellow("⚡︎")} Succesfully loaded ${colors.green(
            colors.bold(file),
          )} file`,
        );

        return RPCConfig;
      }
    }
    // Last call load defaults no matter what
    console.warn(
      `  ${colors.yellow("⚡︎")} No RPC config found, loading the defaults..`,
    );
    return defaultRPCOptions as RpcPluginOptions;
  } catch (error) {
    console.warn(
      `  ${colors.redBright("⚠︎")} Failed to load RPC config:`,
      error,
    );
    return defaultRPCOptions as RpcPluginOptions;
  }
}

function rpcPlugin(devOptions: Partial<RpcPluginOptions> = {}): PluginOption {
  let options: RpcPluginOptions;
  let config: ResolvedConfig;
  let viteServer: ViteDevServer;

  return {
    name: "vite-uni-rpc",
    enforce: "pre",
    // Plugin methods
    async configResolved(resolvedConfig) {
      // if (!config) {
      const uniConfig = await loadRPCConfig();
      options = mergeConfig(uniConfig, devOptions) as RpcPluginOptions;
      config = resolvedConfig;
      // }
    },
    async configureServer(server) {
      viteServer = server;
      const { adapter: _adapter, ...rest } = options;
      // console.log("configureServer", { config, viteServer });
      // ✅ Scan BEFORE registering middleware
      //
      // await scanForServerFiles(config, viteServer);
      if (serverFunctionsMap.size === 0) {
        await scanForServerFiles(config, viteServer);
      }

      // in dev mode we always use express/connect adapter
      server.middlewares.use(createRPCMiddleware(rest));
    },

    // async sharedDuringBuild(server) {
    //   if (server && config) {
    //     await scanForServerFiles(config, server);
    //   }
    // },
    async buildStart() {
      // Prepare the server functions
      // console.log("buildStart", { config, viteServer });
      if (!viteServer && config) {
        await scanForServerFiles(config);
      }
    },
    async transform(code: string, id: string, ops?: { ssr?: boolean }) {
      // Only transform files with server functions for client builds
      if (
        !code.includes("createServerFunction") || // any other file is unchanged
        ops?.ssr || // file loaded on server remains unchanged
        (code.includes("createServerFunction") &&
          typeof process === "undefined") // file loaded in client IS CHANGED
      ) {
        return null;
      }

      if (serverFunctionsMap.size === 0) {
        await scanForServerFiles(config);
      }
      console.log(
        "before transformWithEsbuild(getClientModules(options))",
        serverFunctionsMap,
      );

      const result = await transformWithEsbuild(getClientModules(options), id, {
        loader: "js",
        target: "es2020",
      });

      return {
        code: result.code,
        map: null,
      };
    },
  } satisfies PluginOption;
}

export { rpcPlugin as default };
export { defineConfig, loadRPCConfig };
export type * from "./types.d.ts";
export {};
