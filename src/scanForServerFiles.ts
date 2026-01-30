import type { ResolvedConfig, ViteDevServer } from "vite";
import type { ServerFunction } from "vite-uni-rpc";
import { createServer } from "vite";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import { functionMappings, serverFunctionsMap } from "./functionsMap";

type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
  server?: Partial<ResolvedConfig["server"]>;
};

let isScanned = false;
export const scanForServerFiles = async (
  initialCfg?: ScanConfig,
  devServer?: ViteDevServer,
) => {
  // ✅ Skip if already scanned
  if (isScanned && !devServer) {
    return;
  }
  functionMappings.clear();
  let server = devServer;
  const config =
    (!initialCfg && !devServer) || !initialCfg
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
    // const { createServer } = await import("vite");
    server = await createServer({
      server: config.server,
      appType: "custom",
      base: config.base,
      root: config.root,
    });
  }

  const svFiles = ["server.ts", "server.js", "server.mjs", "server.mts"];
  const apiDir = join(config.root, "src", "api");
  const files = (await readdir(apiDir, { withFileTypes: true }))
    .filter((f) => svFiles.some((fn) => f.name.includes(fn)))
    .map((f) => join(apiDir, f.name));

  try {
    for (const file of files) {
      try {
        // Transform TypeScript to JavaScript using the loaded transform function
        const moduleExports =
          //server &&
          (await server.ssrLoadModule(file)) as Record<string, ServerFunction>;
        const moduleEntries = Object.entries(moduleExports);
        if (!moduleEntries.length) {
          console.warn("No server function found.");
          // Remember to always close the temporary dev server!
          if (!devServer && server) {
            await server.close();
          }
          return;
        }
        console.log({ moduleEntries });

        // Examine each export
        for (const [exportName, exportValue] of moduleEntries) {
          serverFunctionsMap.set(exportName, {
            name: exportName,
            fn: exportValue as unknown as ServerFunction<never, never>,
          });
          // console.log(await exportValue());
        }

        for (const [exportName, exportValue] of moduleEntries) {
          console.log({ exportName, exportValue, serverFunctionsMap });

          for (const [
            registeredName,
            serverFn,
          ] of serverFunctionsMap.entries()) {
            console.log({ registeredName, serverFn });
            if (
              serverFn.name === registeredName &&
              (serverFn.fn as unknown as ServerFunction) === exportValue
            ) {
              functionMappings.set(registeredName, exportName);
            }
          }
        }
        // Remember to always close the temporary dev server!
        // if (!devServer) {
        //   await server.close();
        // }
      } catch (error) {
        console.error("Error loading file:", file, error);
      }
    }
  } finally {
    // ✅ Only close if we created the server
    if (!devServer && server) {
      await server.close();
    }
    // ✅ Mark as scanned
    isScanned = true;
  }

  console.log({ files }, isScanned, functionMappings, serverFunctionsMap);
};
