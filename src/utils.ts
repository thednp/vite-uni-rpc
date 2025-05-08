// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { serverFunctionsMap } from "./registry";
import { type ServerFnEntry } from "./types";
import { ResolvedConfig, ViteDevServer } from "vite";


export const isExpressRequest = (r: Request | IncomingMessage): r is Request => {
  return 'header' in r;
};

export const isExpressResponse = (r: Response | ServerResponse): r is Response => {
  return 'header' in r;
};

export const readBody = (req: Request | IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};

export const functionMappings = new Map<string, string>();

export const scanForServerFiles = async (
  config: ResolvedConfig,
  devServer?: ViteDevServer,
) => {
  functionMappings.clear();
  const apiDir = join(config.root, "src", "api");
  let server = devServer;
  if (!server) {
    const { createServer } = await import("vite");
    server = await createServer({
      server: { ...config.server, middlewareMode: true },
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
    if (!devServer) {
      server.close();
    }
  }
};

export const sendResponse = (res: ServerResponse | Response, data: Record<string, string>, statusCode = 200) => {
  if (isExpressResponse(res)) {
    // Express-style response
    return res
      .status(statusCode)
      .set({ "Content-Type": "application/json" })
      .send(data);
  } else {
    // Vite/Connect-style response
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }
};

export const getModule = (
  fnName: string,
  fnEntry: string,
  options: { rpcPrefix: string },
) =>
  `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.rpcPrefix}/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
  `.trim();
