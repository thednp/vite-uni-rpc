import {
  corsMiddleware,
  csrfMiddleware,
  defaultRPCOptions,
  functionMappings,
  getModule,
  rpcMiddleware,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-AQ73IPAT.js";

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
    buildStart() {
      serverFunctionsMap.clear();
    },
    async transform(code, id, ops) {
      if (!code.includes("createServerFunction") || // config.command === "build" && process.env.MODE !== "production" ||
      ops?.ssr) {
        return null;
      }
      if (functionMappings.size === 0) {
        await scanForServerFiles(config, viteServer);
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
      scanForServerFiles(config, server);
      server.middlewares.use(corsMiddleware);
      server.middlewares.use(csrfMiddleware);
      server.middlewares.use(rpcMiddleware);
    }
  };
}
export {
  rpcPlugin as default
};
