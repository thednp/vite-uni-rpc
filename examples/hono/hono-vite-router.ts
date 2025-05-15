import type { MiddlewareHandler } from 'hono';
import { type IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, TransformResult, ViteDevServer } from 'vite';
// import { loadConfigFromFile,  } from 'vite';
import { resolve } from 'node:path';
import { serverFunctionsMap } from 'vite-uni-rpc/server';

export function createViteRouter(
  vite: ViteDevServer,
  rpcPreffix: string
): MiddlewareHandler {
  return async (c, next) => {
    const path = c.req.path;
    console.log('[ViteRouter] Request path: ', path);

    // Log RPC functions for /_server/* paths
    if (path.startsWith(`/${rpcPreffix}`)) {
      console.log('[ViteRouter] RPC functions: ', serverFunctionsMap.size, Array.from(serverFunctionsMap.keys()));
    }

    // Check if path is module (e.g., '/@vite/*', '/src/*', or ends with .js/.ts/etc.)
    const isModulePath =
      path.startsWith('/@vite') ||
      path.startsWith('/@id') ||
      path.startsWith('/src/') ||
      path.startsWith('virtual:') ||
      // path.includes('well-known/appspecific/com.chrome.devtools.json') ||
      path.startsWith('/node_modules/') ||
      /\.(js|ts|jsx|tsx|css|scss|json|mjs|mts)$/.test(path);
    const isRPCPath = path.startsWith(`/${rpcPreffix}`);
    const isDevTools = path.includes('well-known/appspecific/com.chrome.devtools.json');

    if ((!isModulePath && !isRPCPath) || isDevTools) {
      console.log('[ViteRouter] Passing non-module path to Hono: ', path);
      await next();
      return;
    }

    // Early check for module existence
    const moduleId = ['/@vite/', '/@id/', 'virtual:'].some((p) => path.startsWith(p))
      ? path
      : resolve(vite.config.root, path.replace(/^\//, ''));
    const moduleGraph = vite.moduleGraph.getModuleById(moduleId);
    if (isModulePath && !moduleGraph && !['/@vite/', '/@id/', 'virtual:'].some((p) => path.startsWith(p))) {
      return new Response(`Module not found: ${path}`, { status: 404 });
    }

    const req = c.req.raw as Request & IncomingMessage;
    // Clone Headers to plain object for Vite, preserve Headers for Hono
    const headersObj = req.headers
      ? Object.fromEntries(
          Array.from(req.headers.entries()).map(([key, value]) => [key.toLowerCase(), value])
        )
      : {};
    // Ensure valid WebSocket URL components
    const vitePort = 5174; // Align with server logs
    const hostHeader = c.req.header('host') || `localhost:${vitePort}`;
    const protocol = c.req.header('x-forwarded-proto') || (vite.config.server.https ? 'https' : 'http');
    const hostname = hostHeader.split(':')[0];
    headersObj.host = hostHeader;
    headersObj.origin = `${protocol}://${hostHeader}`;
    headersObj.referer = `${protocol}://${hostHeader}${path}`;
    Object.defineProperties(req, {
      url: { value: path, writable: true },
      method: { value: c.req.method, writable: true },
      headers: { value: headersObj, writable: true },
      originalUrl: { value: path, writable: true },
      baseUrl: { value: '', writable: true },
      path: { value: path, writable: true },
      query: {
        value: Object.fromEntries(new URLSearchParams(c.req.query()).entries()),
        writable: true,
      },
      protocol: { value: protocol, writable: true },
      hostname: { value: hostname, writable: true },
      connection: { value: {}, writable: true },
      socket: { value: { encrypted: protocol === 'https' }, writable: true },
      get: {
        value: (header: string) => headersObj[header.toLowerCase()],
        writable: true,
      },
    });

    console.log('[ViteRouter] Middleware stack: ', vite.middlewares.stack.map((m) => m.handle.name || 'anonymous'));


    // Early transform for module serving
    let transformResult: TransformResult | null;
    try {
      transformResult = await vite.transformRequest(path);
    } catch (err) {
      return new Response(`Transform failed for ${path}: ${err.message}`, { status: 500 });
    }

    // Serve transformed modules directly
    if (transformResult && transformResult.code) {
      const headers = new Headers({ 'content-type': 'application/javascript' });
      return new Response(transformResult.code, { status: 200, headers });
    }

    // Fallback to Vite middlewares (includes vite-uni-rpc for /_server/*)
    const res = new ServerResponse(req);
    let responseBody = '';
    const customHeaders: Record<string, string> = {};
    Object.assign(res, {
      write: (chunk: string) => {
        responseBody += chunk;
        return res;
      },
      end: (chunk?: string) => {
        if (chunk) responseBody += chunk;
        return res;
      },
      setHeader: (name: string, value: string) => {
        customHeaders[name.toLowerCase()] = value;
        return res;
      },
      getHeader: (name: string) => customHeaders[name.toLowerCase()],
    });
    // In createViteRouter, before vite.middlewares(req, res, ...)
    console.log('[ViteRouter] Middleware stack: ', vite.middlewares.stack.map((m) => m.handle.name || 'anonymous'));

    try {
      return await new Promise((resolve, reject) => {
        vite.middlewares(req, res, (err?: Error) => {
          if (err) {
            console.error('[ViteRouter] Middleware error for', path, err);
            reject(err);
            return;
          }
          const headers = new Headers();
          for (const [key, value] of Object.entries(customHeaders)) {
            if (value) headers.set(key, value);
          }
          resolve(new Response(responseBody, { status: res.statusCode, headers }));
        });
      });
    } catch (err) {
      if (isModulePath && !moduleGraph) {
        return new Response(`Module not found: ${path}`, { status: 404 });
      }
      return new Response(`Failed to process ${path}: ${err.message}`, { status: 500 });
    }
  };
}
