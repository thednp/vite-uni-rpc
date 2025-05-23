// vite-uni-rpc/src/utils.ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type { ResolvedConfig, ViteDevServer } from "vite";
import type {
  RpcPluginOptions,
  ServerFnEntry,
  ServerFunction,
  ServerFunctionOptions,
} from "./types";

export const serverFunctionsMap = new Map<
  string,
  ServerFunction
>();

export const functionMappings = new Map<string, string>();

type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
  server?: Partial<ResolvedConfig["server"]>;
};

export const scanForServerFiles = async (
  initialCfg?: ScanConfig,
  devServer?: ViteDevServer,
) => {
  functionMappings.clear();
  let server = devServer;
  const config = !initialCfg && !devServer || !initialCfg
    ? {
      // always scan relative to the real root
      root: process.cwd(),
      base: process.env.BASE || "/",
      server: { middlewareMode: true },
    }
    : {
      ...initialCfg,
      // always scan relative to the real root
      root: process.cwd(),
    };

  if (!server) {
    const { createServer } = await import("vite");
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base,
      root: config.root,
    });
  }

  const svFiles = [
    "server.ts",
    "server.js",
    "server.mjs",
    "server.mts",
  ];
  const apiDir = join(config.root, "src", "api");
  const files = (await readdir(apiDir, { withFileTypes: true }))
    .filter((f) => svFiles.some((fn) => f.name.includes(fn)))
    .map((f) => join(apiDir, f.name));

  for (const file of files) {
    try {
      // Transform TypeScript to JavaScript using the loaded transform function
      const moduleExports = await server.ssrLoadModule(
        file,
      ) as Record<
        string,
        ServerFnEntry
      >;
      const moduleEntries = Object.entries(moduleExports);
      if (!moduleEntries.length) {
        console.warn("No server function found.");
        // Remember to always close the temporary dev server!
        if (!devServer) {
          server.close();
        }
        return;
      }

      // Examine each export
      for (const [exportName, exportValue] of moduleEntries) {
        for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
          if (
            serverFn.name === registeredName &&
            serverFn.fn === exportValue
          ) {
            functionMappings.set(registeredName, exportName);
          }
        }
      }
      // Remember to always close the temporary dev server!
      if (!devServer) {
        server.close();
      }
    } catch (error) {
      console.error("Error loading file:", file, error);
    }
  }
};

const getModule = (
  fnName: string,
  fnEntry: string,
  options: Partial<ServerFunctionOptions> & {
    contentType: ServerFunctionOptions["contentType"];
    rpcPreffix: string;
  },
) => {
  let bodyHandling;
  switch (options.contentType) {
    case "text/plain":
      bodyHandling = `
    const body = args[0];
    const headers = {
      'Content-Type': 'text/plain'
    };`;
      break;
    default:
      bodyHandling = `
    const body = JSON.stringify(args);
    const headers = {
      'Content-Type': 'application/json'
    };`;
  }

  return `
  export const ${fnEntry} = async (...args) => {
    ${bodyHandling}
    const response = await fetch('/${options.rpcPreffix}/${fnName}', {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: body,
    });
    return await handleResponse(response);
  }`;
};

export const getClientModules = (initialOptions: RpcPluginOptions) => {
  return `
// Client-side RPC modules
const handleResponse = async (response) => {
if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
const result = await response.json();
if (result.error) throw new Error(result.error);
return result.data;
}
${
    Array.from(functionMappings.entries())
      .map(([registeredName, exportName]) =>
        getModule(registeredName, exportName, {
          ...initialOptions,
          ...(serverFunctionsMap.get(registeredName)
            ?.options as ServerFunctionOptions || {}),
        })
      )
      .join("\n")
  }
`.trim();
};
