import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { transformWithEsbuild } from "vite";
import { functionMappings, getModule, scanForServerFiles } from "./utils";
import { defaultRPCOptions } from "./options";
import { RpcPluginOptions } from "./types";
import { createCors } from "./createCors";
import { createCSRF } from "./createCSRF";
import { createRPCMiddleware } from "./createMid";

export default function rpcPlugin(
  initialOptions: Partial<RpcPluginOptions> = {},
): Plugin {
  const options = { ...defaultRPCOptions, ...initialOptions };
  let config: ResolvedConfig;
  let viteServer: ViteDevServer;

  return {
    name: "vite-mini-rpc",
    enforce: "pre",

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

      const transformedCode = `
// Client-side RPC modules
const handleResponse = (response) => {
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
${
        Array.from(functionMappings.entries())
          .map(([registeredName, exportName]) =>
            getModule(registeredName, exportName, options)
          )
          .join("\n")
      }
`.trim();
      const result = await transformWithEsbuild(transformedCode, id, {
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
