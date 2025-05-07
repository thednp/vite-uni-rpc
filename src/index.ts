import type { Plugin, ResolvedConfig } from "vite";
import { createHash } from "node:crypto";
import process from "node:process";
import { serverFunctionsMap } from "./serverFunctionsMap";
import {
  functionMappings,
  getModule,
  readBody,
  scanForServerFiles,
} from "./utils";
import { getCookies, setSecureCookie } from "./cookie";
import { defaultOptions } from "./options";
import { RpcPluginOptions } from "./types";

export default function rpcPlugin(
  initialOptions: Partial<RpcPluginOptions> = {},
): Plugin {
  const options = { ...defaultOptions, ...initialOptions };
  let config: ResolvedConfig;

  return {
    name: "vite-mini-rpc",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      serverFunctionsMap.clear();
    },
    transform(code: string, _id: string, ops?: { ssr?: boolean }) {
      // Only transform files with server functions for client builds
      if (
        !code.includes("createServerFunction") ||
        process.env.MODE !== "production" || ops?.ssr
      ) {
        return null;
      }

      const transformedCode = `
// Client-side RPC modules
${
        Array.from(functionMappings.entries())
          .map(([registeredName, exportName]) =>
            getModule(registeredName, exportName, options)
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
