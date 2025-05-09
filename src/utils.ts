// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import type {
  Arguments,
  RpcPlugin,
  RpcPluginOptions,
  ServerFnEntry,
  ServerFunction,
} from "./types";
import type { ResolvedConfig, ViteDevServer } from "vite";

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
 * Resolve file extension.
 * @param filePath
 * @param extensions default [".tsx", ".jsx", ".ts", ".js"]
 */
export const resolveExtension = (
  filePath: string,
  extensions = [".tsx", ".jsx", ".ts", ".js"],
) => {
  const [noExt] = filePath?.split(".");
  const [noSlash] = noExt.slice(filePath.startsWith("/") ? 1 : 0);
  const paths = extensions.map((ext) => (noSlash + ext));
  const path = paths.find((p) => existsSync(resolve(process.cwd() + p)));

  return path || (noExt + ".js");
};

/**
 * Returns the current project vite configuration, more specifically
 * the `ResolvedConfig`.
 */
export const getViteConfig = async () => {
  const filePath = resolveExtension("/vite.config.ts");
  return (await import("." + filePath)).default as ResolvedConfig;
};

export const getRPCPluginConfig = async () => {
  const viteConfig = await getViteConfig();
  const rpcPluginConfig = viteConfig?.plugins?.find((p) =>
    p.name === "vite-mini-rpc"
  ) as RpcPlugin;
  if (!rpcPluginConfig) {
    console.warn(
      `The "vite-mini-rpc" plugin is not present in the current configuration.`,
    );
    return;
  }
  return rpcPluginConfig.pluginOptions;
};

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
      ...(await getViteConfig()),
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

  const filePath = resolveExtension("/src/api/server.ts");
  try {
    // Transform TypeScript to JavaScript using the loaded transform function
    const moduleExports = await server.ssrLoadModule("." + filePath) as Record<
      string,
      ServerFnEntry
    >;

    // Examine each export
    for (const [exportName, exportValue] of Object.entries(moduleExports)) {
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
    console.error("Error loading file:", filePath, error);
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
