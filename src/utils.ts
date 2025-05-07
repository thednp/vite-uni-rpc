// vite-mini-rpc/src/utils.ts
import type { IncomingMessage } from "node:http";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { serverFunctionsMap } from "./serverFunctionsMap";

export const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};

export const functionMappings = new Map<string, string>();

export const scanForServerFiles = async (root: string) => {
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
      const moduleExports = await import(fileUrl);

      // Examine each export
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        // Check if this export is in the serverFunctionsMap
        for (
          const [registeredName, serverFn] of serverFunctionsMap.entries()
        ) {
          if (serverFn.fn === exportValue) {
            // Found a match - store the mapping
            functionMappings.set(registeredName, exportName);
          }
        }
      }
    } catch (error) {
      console.error("Error loading server file:", file, error);
    }
  }
};
