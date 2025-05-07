// vite-mini-rpc/src/utils.ts
import type { IncomingMessage } from "node:http";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { serverFunctionsMap } from "./serverFunctionsMap";
import { type ServerFnEntry } from "./types";

export const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};

export const functionMappings = new Map<string, string>();

export const scanForServerFiles = async (root: string) => {
  functionMappings.clear();
  const apiDir = join(root, "src", "api");

  // Find all server.ts/js files in the api directory
  const files = (await readdir(apiDir, { withFileTypes: true })).filter(
    (f) => {
      return f.name.includes("server.ts") || f.name.includes("server.js");
    },
  ).map((f) => join(apiDir, f.name));

  // Load and execute each server file
  for (const file of files) {
    try {
      const fileUrl = `file://${file}`;
      // Import the module to get the exported functions
      const moduleExports = await import(fileUrl) as Record<
        string,
        ServerFnEntry
      >;

      // Examine each export
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        for (
          const [registeredName, serverFn] of serverFunctionsMap.entries()
        ) {
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
// const requestToken = await getToken();
const response = await fetch('/${options.urlPrefix}/${fnName}', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
credentials: 'include',
body: JSON.stringify(args)
});
if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
const result = await response.json();
if (result.error) throw new Error(result.error);
return result.data;
}
`.trim();
