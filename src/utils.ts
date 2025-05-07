// vite-mini-rpc/src/utils.ts
import type { IncomingMessage } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { serverFunctionsMap } from "./serverFunctionsMap";
import { type ServerFnEntry } from "./types";
import { ResolvedConfig, transformWithEsbuild } from "vite";

export const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};

export const functionMappings = new Map<string, string>();

export const scanForServerFiles = async (config: ResolvedConfig) => {
  functionMappings.clear();
  const apiDir = join(config.root, "src", "api");

  // Find all server.ts/js files in the api directory
  const files = (await readdir(apiDir, { withFileTypes: true }))
    .filter((f) => f.name.includes("server.ts") || f.name.includes("server.js"))
    .map((f) => join(apiDir, f.name));

  // Load and execute each server file
  for (const file of files) {
    try {
      // Read the file content
      const code = await readFile(file, 'utf-8');
      
      // Transform TypeScript to JavaScript using the loaded transform function
      const result = await transformWithEsbuild(code, file, {
        loader: 'ts',
        format: 'esm',
        target: 'es2020',
      });

      const moduleExports = await import(
        `data:text/javascript;base64,${Buffer.from(result.code).toString('base64')}`
      );

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
  }
};

export const getModule = (
  fnName: string,
  fnEntry: string,
  options: { urlPrefix: string },
) =>
  `
export const ${fnEntry} = async (...args) => {
  const response = await fetch('/${options.urlPrefix}/${fnName}', {
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
