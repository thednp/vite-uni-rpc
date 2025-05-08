import {
  createCSRF,
  createCors,
  createRPCMiddleware,
  defaultOptions,
  functionMappings,
  getModule,
  scanForServerFiles,
  serverFunctionsMap
} from "./chunk-LYIE444W.js";

// src/index.ts
import { transformWithEsbuild } from "vite";

// src/midCors.ts
var corsMiddleware = createCors();

// src/midCSRF.ts
var csrfMiddleware = createCSRF();

// src/midRPC.ts
var rpcMiddleware = createRPCMiddleware();

// src/index.ts
function rpcPlugin(initialOptions = {}) {
  const options = { ...defaultOptions, ...initialOptions };
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
