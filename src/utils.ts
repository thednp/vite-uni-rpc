// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
// import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import type { ConfigEnv, ResolvedConfig, ViteDevServer } from "vite";
import { loadConfigFromFile, mergeConfig } from "vite";
import { defaultRPCOptions } from "./options";
import type {
  Arguments,
  RpcPluginOptions,
  ServerFnEntry,
  ServerFunction,
} from "./types";

export const serverFunctionsMap = new Map<
  string,
  ServerFunction<Arguments[], unknown>
>();

export const isExpressRequest = (
  r: Request | IncomingMessage,
): r is Request => {
  return "header" in r && "get" in r;
};

export const isExpressResponse = (
  r: Response | ServerResponse,
): r is Response => {
  return "header" in r && "set" in r;
};

/**
 * Utility to define `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
export function defineRPCConfig(config: Partial<RpcPluginOptions>) {
  return mergeConfig(defaultRPCOptions, config) as RpcPluginOptions;
}

/**
 * Utility to load `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
export async function loadRPCConfig(configFile?: string) {
  try {
    const env: ConfigEnv = {
      command: "serve",
      mode: process.env.NODE_ENV || "development",
    };
    const defaultConfigFiles = [
      "rpc.config.ts",
      "rpc.config.js",
      "rpc.config.mjs",
      "rpc.config.mts",
      "rpc.config.cjs",
      "rpc.config.cts",
    ];

    // If specific config file provided
    if (configFile) {
      const result = await loadConfigFromFile(env, configFile);
      if (result) {
        return mergeConfig(defaultRPCOptions, result.config);
      }
    }

    // Try default config files
    for (const file of defaultConfigFiles) {
      const result = await loadConfigFromFile(env, file);
      if (result) {
        return mergeConfig(defaultRPCOptions, result.config);
      }
    }

    return defaultRPCOptions;
  } catch (error) {
    console.warn("Failed to load RPC config:", error);
    return defaultRPCOptions;
  }
}

export const readBody = (req: Request | IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};

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
      root: process.cwd(),
      base: process.env.BASE || "/",
      server: { middlewareMode: true },
    }
    : initialCfg;

  if (!server) {
    const { createServer } = await import("vite");
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base,
    });
  }

  const svFiles = [
    "server.ts",
    "server.js",
    "server.mjs",
    "server.mts",
  ];

  const apiDir = resolve(config.root, "api/src");
  for (const file of svFiles) {
    try {
      // Transform TypeScript to JavaScript using the loaded transform function
      const moduleExports = await server.ssrLoadModule(
        resolve(apiDir, file),
      ) as Record<
        string,
        ServerFnEntry
      >;
      const moduleEntries = Object.entries(moduleExports);
      if (!moduleEntries.length) {
        console.warn("No server function found.");
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
    } catch (error) {
      console.error("Error loading file:", file, error);
    }
  }

  // Remember to always close the temporary dev server!
  if (!devServer) {
    server.close();
  }
};

export const sendResponse = (
  res: ServerResponse | Response,
  response: Record<string, string | unknown>,
  statusCode = 200,
) => {
  if (isExpressResponse(res)) {
    // Express-style response
    return res
      .status(statusCode)
      .set({ "Content-Type": "application/json" })
      .send(response);
  } else {
    // Vite/Connect-style response
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(response));
  }
};

const getModule = (
  fnName: string,
  fnEntry: string,
  options: { rpcPreffix: string },
) =>
  `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.rpcPreffix}/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(args)
  });
  return await handleResponse(response);
}
  `.trim();

export const getClientModules = (options: RpcPluginOptions) => {
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
        getModule(registeredName, exportName, options)
      )
      .join("\n")
  }
`.trim();
};
