import {
  createCSRF,
  createCors,
  createRPCMiddleware,
  defaultRPCOptions,
  defineRPCConfig,
  getClientModules,
  loadRPCConfig,
  scanForServerFiles
} from "./chunk-XWUIKFW4.js";

// src/index.ts
import { transformWithEsbuild } from "vite";
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
export {
  rpcPlugin as default,
  defineRPCConfig,
  loadRPCConfig
};
