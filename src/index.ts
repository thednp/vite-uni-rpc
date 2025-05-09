import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { transformWithEsbuild } from "vite";
import { getClientModules, scanForServerFiles } from "./utils";
import { defaultRPCOptions } from "./options";
import { RpcPluginOptions } from "./types";
import { createCors } from "./createCors";
import { createCSRF } from "./createCSRF";
import { createRPCMiddleware } from "./createMid";

// Create a custom interface extending Plugin
interface RpcPlugin extends Plugin {
  pluginOptions: RpcPluginOptions;
}

export default function rpcPlugin(
  initialOptions: Partial<RpcPluginOptions> = {},
): RpcPlugin {
  const options = { ...defaultRPCOptions, ...initialOptions };
  let config: ResolvedConfig;
  let viteServer: ViteDevServer;

  return {
    name: "vite-mini-rpc",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    get pluginOptions() {
      return options;
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
