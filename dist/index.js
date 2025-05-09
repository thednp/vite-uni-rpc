import {
  createCSRF,
  createCors,
  createRPCMiddleware,
  defaultRPCOptions,
  functionMappings,
  getModule,
  scanForServerFiles
} from "./chunk-X5LHOXOQ.js";

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
const handleResponse = (response) => {
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
${Array.from(functionMappings.entries()).map(
        ([registeredName, exportName]) => getModule(registeredName, exportName, options)
      ).join("\n")}
`.trim();
      const result = await transformWithEsbuild(transformedCode, id, {
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
  rpcPlugin as default
};
