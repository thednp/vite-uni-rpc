import type { Plugin, ResolvedConfig } from "vite";
import { createHash } from "node:crypto";
// import { transformWithEsbuild } from 'vite'
import process from "node:process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { serverFunctionsMap } from "./serverFunctionsMap";
import { readBody } from "./utils";
import { getCookies, setSecureCookie } from "./cookie";
import { defaultOptions } from "./options";
import { RpcPluginOptions } from "./types";

export default function rpcPlugin(
  initialOptions: Partial<RpcPluginOptions> = {},
): Plugin {
  const options = { ...defaultOptions, ...initialOptions };
  let config: ResolvedConfig;
  const functionMappings = new Map<string, string>();

  const scanForServerFiles = async (root: string) => {
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

  return {
    name: "vite-mini-rpc",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      serverFunctionsMap.clear();
    },
    async transform(code: string, _id: string, ops?: { ssr?: boolean }) {
      // Only transform files with server functions for client builds
      if (
        !code.includes("createServerFunction") ||
        process.env.MODE !== "production" || ops?.ssr
      ) {
        return null;
      }
      // Ensure mappings are available
      if (functionMappings.size === 0) {
        await scanForServerFiles(config.root);
      }

      const getModule = (fnName: string, fnEntry: string) =>
        `
export const ${fnEntry} = async (...args) => {
  // const requestToken = await getToken();
  const response = await fetch('/${options.urlPrefix}/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
`.trim();

      const transformedCode = `
// Client-side RPC modules
${
        Array.from(functionMappings.entries())
          .map(([registeredName, exportName]) =>
            getModule(registeredName, exportName)
          )
          .join("\n")
      }
`.trim();

      return {
        code: transformedCode,
        map: null,
      };
    },

    configureServer(server) {
      scanForServerFiles(config.root);
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type,X-CSRF-Token",
        );
        res.setHeader("Access-Control-Allow-Credentials", "true");
        const cookies = getCookies(req.headers.cookie);

        if (!cookies["X-CSRF-Token"]) {
          const csrfToken = createHash("sha256").update(Date.now().toString())
            .digest("hex");
          setSecureCookie(res, "X-CSRF-Token", csrfToken, {
            // Can add additional options here
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(), // 24h
            SameSite: "Strict", // Prevents CSRF attacks
          });
        }
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });

      // Handle RPC calls
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(`/${options.urlPrefix}/`)) return next();

        const cookies = getCookies(req.headers.cookie);
        const csrfToken = cookies["X-CSRF-Token"];

        if (!csrfToken) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid CSRF token" }));
          return;
        }

        const functionName = req.url.replace(`/${options.urlPrefix}/`, "");
        const serverFunction = serverFunctionsMap.get(functionName);

        if (!serverFunction) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({ error: `Function "${functionName}" not found` }),
          );
          return;
        }

        try {
          const body = await readBody(req);
          const args = JSON.parse(body || "[]");
          const result = await serverFunction.fn(...args);
          res.end(JSON.stringify({ data: result }));
        } catch (error) {
          console.error("RPC error:", error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}
