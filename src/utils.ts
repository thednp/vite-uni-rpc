// vite-mini-rpc/src/utils.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type { ResolvedConfig, ViteDevServer } from "vite";
import type {
  AnyRequest,
  AnyResponse,
  Arguments,
  FrameworkRequest,
  FrameworkResponse,
  JsonValue,
  RpcPluginOptions,
  ServerFnEntry,
  ServerFunction,
} from "./types";

export const serverFunctionsMap = new Map<
  string,
  ServerFunction<Arguments[], unknown>
>();

export const isNodeRequest = (
  req: AnyRequest,
): req is IncomingMessage => {
  return "url" in req && !("raw" in req) && !("originalUrl" in req);
};

export const isHonoRequest = (
  req: AnyRequest,
): req is { raw: IncomingMessage } => {
  return "raw" in req;
};

export const isExpressRequest = (
  req: AnyRequest,
): req is ExpressRequest => {
  return "originalUrl" in req;
};

export const isNodeResponse = (
  res: AnyResponse,
): res is ServerResponse => {
  return "end" in res && !("raw" in res) && !("json" in res);
};

export const isHonoResponse = (
  res: AnyResponse,
): res is { raw: ServerResponse } => {
  return "raw" in res;
};

export const isExpressResponse = (
  res: AnyResponse,
): res is ExpressResponse => {
  return "json" in res && "send" in res;
};

export const getRequestDetails = (request: FrameworkRequest) => {
  const nodeRequest: IncomingMessage =
    (request.raw || request.req || request) as IncomingMessage;

  const url = request.originalUrl ||
    request.url ||
    nodeRequest.url;

  return {
    nodeRequest,
    url,
    headers: nodeRequest.headers,
    method: nodeRequest.method,
  };
};

export const getResponseDetails = (response: FrameworkResponse) => {
  const nodeResponse: ServerResponse =
    (response.raw || response.res || response) as ServerResponse;

  const isResponseSent = response.headersSent ||
    response.writableEnded ||
    nodeResponse.writableEnded;

  const setHeader = (name: string, value: string) => {
    if (response.header) {
      response.header(name, value);
    } else if (response.setHeader) {
      response.setHeader(name, value);
    } else {
      nodeResponse.setHeader(name, value);
    }
  };

  const getHeader = (name: string) => {
    if (response.getHeader) {
      return response.getHeader(name);
    }
    return nodeResponse.getHeader(name);
  };

  const setStatusCode = (code: number) => {
    if (response.status) {
      response.status(code);
    } else {
      nodeResponse.statusCode = code;
    }
  };

  const send = (output: Record<string, string | unknown>) => {
    if (response.send) {
      response.send(JSON.stringify(output));
    } else {
      nodeResponse.end(JSON.stringify(output));
    }
  };

  const sendResponse = (
    code: number,
    output: Record<string, JsonValue>,
    contentType?: string,
  ) => {
    setStatusCode(code);
    if (contentType) {
      setHeader("Content-Type", contentType);
    }
    send(output);
  };

  return {
    nodeResponse,
    isResponseSent,
    setHeader,
    getHeader,
    statusCode: nodeResponse.statusCode,
    setStatusCode,
    send,
    sendResponse,
  };
};

export const readBody = (
  req: ExpressRequest | IncomingMessage,
): Promise<string> => {
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
  const apiDir = join(config.root, "src", "api");

  const files = (await readdir(apiDir, { withFileTypes: true }))
    .filter((f) => svFiles.some((fn) => f.name.includes(fn)))
    .map((f) => join(apiDir, f.name));

  for (const file of files) {
    try {
      // Transform TypeScript to JavaScript using the loaded transform function
      const moduleExports = await server.ssrLoadModule(
        file,
      ) as Record<
        string,
        ServerFnEntry
      >;
      const moduleEntries = Object.entries(moduleExports);
      if (!moduleEntries.length) {
        console.warn("No server function found.");
        // Remember to always close the temporary dev server!
        if (!devServer) {
          server.close();
        }
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
      // Remember to always close the temporary dev server!
      if (!devServer) {
        server.close();
      }
    } catch (error) {
      console.error("Error loading file:", file, error);
    }
  }
};

export const sendResponse = (
  res: ServerResponse | ExpressResponse,
  output: Record<string, string | number>,
  statusCode = 200,
) => {
  if (isExpressResponse(res)) {
    // Express-style response
    return res
      .status(statusCode)
      .set({ "Content-Type": "application/json" })
      .send(output);
  } else {
    // Vite/Connect-style response
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(output));
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
