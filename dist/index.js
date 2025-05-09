import {
  corsMiddleware,
  csrfMiddleware,
  defaultRPCOptions,
  functionMappings,
  getModule,
  rpcMiddleware,
  scanForServerFiles
} from "./chunk-TIY6GOZR.js";

// src/index.ts
import { transformWithEsbuild } from "vite";
function rpcPlugin(initialOptions = {}) {
  const options = { ...defaultRPCOptions, ...initialOptions };
  let config;
  let viteServer;
  return {
    name: "vite-mini-rpc",
    enforce: "pre",
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
      const transformedCode = `
// Client-side RPC modules
${Array.from(functionMappings.entries()).map(
        ([registeredName, exportName]) => getModule(registeredName, exportName, options)
      ).join("\n")}
`.trim();
      const result = await transformWithEsbuild(transformedCode, id, {
        loader: "js",
        target: "es2020"
      });
      return {
        // code: transformedCode,
        code: result.code,
        map: null
      };
    },
    configureServer(server) {
      viteServer = server;
      server.middlewares.use(corsMiddleware);
      server.middlewares.use(csrfMiddleware);
      server.middlewares.use(rpcMiddleware);
    }
  };
}
export {
  rpcPlugin as default
};
