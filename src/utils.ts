// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type {
  Arguments,
  RpcPluginOptions,
  ServerFnEntry,
  ServerFunction,
} from "./types";
import { ResolvedConfig, ViteDevServer } from "vite";

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

  const apiDir = join(config.root, "src", "api");
  if (!server) {
    const { createServer } = await import("vite");
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base,
    });
  }

  // Find all server.ts/js files in the api directory
  const files = (await readdir(apiDir, { withFileTypes: true }))
    .filter((f) => f.name.includes("server.ts") || f.name.includes("server.js"))
    .map((f) => join(apiDir, f.name));

  // Load and execute each server file
  for (const file of files) {
    try {
      // Transform TypeScript to JavaScript using the loaded transform function
      const moduleExports = await server.ssrLoadModule(file) as Record<
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
      console.error("Error loading server file:", file, error);
    }
    // Remember to always close the temporary dev server!
    if (!devServer) {
      server.close();
    }
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
