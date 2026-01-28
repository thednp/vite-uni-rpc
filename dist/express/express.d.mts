import { Connect } from "vite";
import { Context, Next } from "hono";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import * as node_http0 from "node:http";
import { IncomingMessage as IncomingMessage$1, ServerResponse as ServerResponse$1 } from "node:http";
import { Request, Response as Response$1 } from "express";

//#region src/hono/types.d.ts
interface HonoMiddlewareHooks {
  handler: (c: Context, next: Next) => Promise<void>;
  onRequest: (c: Context) => Promise<void>;
  onResponse: (c: Context) => Promise<void>;
  onError: (error: unknown, c: Context) => Promise<void>;
}
//#endregion
//#region src/fastify/types.d.ts
interface FastifyMiddlewareHooks {
  handler: (req: FastifyRequest, res: FastifyReply, done: HookHandlerDoneFunction) => Promise<void>;
  onError: (error: unknown, req: FastifyRequest, res: FastifyReply) => Promise<void>;
  onRequest: (req: FastifyRequest) => Promise<void>;
  onResponse: (res: FastifyReply) => Promise<void>;
}
//#endregion
//#region src/types.d.ts
interface FrameworkHooks {
  express: ExpressMiddlewareHooks;
  hono: HonoMiddlewareHooks;
  fastify: FastifyMiddlewareHooks;
}
type BodyResult = {
  contentType: "application/json";
  data: JsonValue;
} | {
  contentType: "text/plain";
  data: string;
};
// primitives and their compositions
type JsonPrimitive = string | number | boolean | null | undefined;
type JsonObject = {
  [key: string]: JsonValue | JsonArray;
};
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
/**
 * ### vite-uni-rpc
 * The plugin configuration allows for granular control of your
 * application RPC calls. The default settings are optimized for development
 * environments while providing a secure foundation for production use.
 */
interface RpcPluginOptions$1 {
  // RPC Middleware Options
  /**
   * RPC prefix without leading slash (e.g. "__rpc")
   * Leading slash will be added automatically by the middleware.
   * This prefix defines the base path for all RPC endpoints.
   * @default "__rpc"
   * @example
   * // Results in endpoints like: /api/rpc/myFunction
   * rpcPreffix: "api/rpc"
   */
  rpcPreffix: "__rpc" | string;
  /**
   * Option to set an adapter for the middleware connection. The default is _express_,
   * which is the most popular and battle tested server app. The _express_ adapter is
   * also compatible with the vite's Connect development server.
   * @default express
   */
  adapter: "express" | "hono" | "fastify";
  /**
   * Option to set custom headers to be set for middleware responses.
   * Use this to add specific headers to all responses handled by this middleware.
   *
   * @example
   * headers: {
   *   'X-Custom-Header': 'custom-value',
   *   'Cache-Control': 'no-cache'
   * }
   */
  headers?: MiddlewareOptions["headers"];
  /**
   * Custom error handling hook for RPC middleware errors.
   * Allows you to handle errors in a custom way instead of the default error response.
   *
   * @param error - The error thrown during request processing
   * @param req - The incoming request object
   * @param res - The server response object
   *
   * @example
   * onError: (error, req, res) => {
   *   console.error(`[${new Date().toISOString()}] Error:`, error);
   *   // Custom error handling logic
   *   sendResponse(res, { error: "Custom error message" }, 500));
   * }
   */
  onError?: MiddlewareOptions["onError"];
  /**
   * Hook executed before processing each RPC request.
   * Useful for request validation, logging, or custom authentication.
   * Must return void or a Promise that resolves to void.
   *
   * @param req - The incoming request object
   *
   * @example
   * // applies to express adapter
   * onRequest: async (req) => {
   *   // Log incoming requests
   *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
   *
   *   // Add custom validation
   *   const apiKey = req.headers['x-api-key'];
   *   if (!apiKey) throw new Error('Missing API key');
   * }
   */
  onRequest?: MiddlewareOptions["onRequest"];
  /**
   * Hook executed before sending each RPC response.
   * Useful for response modification, logging, or adding custom headers.
   * Must return void or a Promise that resolves to void.
   *
   * @param res - The server response object
   *
   * @example
   * // applies to express adapter
   * onResponse: async (res) => {
   *   // Do something with the response
   *
   *   // Log response metadata
   *   console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
   * }
   */
  onResponse?: MiddlewareOptions["onResponse"];
}
interface MiddlewareOptions<A extends RpcPluginOptions$1["adapter"] = "express"> {
  /**
   * RPC middlewares would like to have a name, specifically for _express_,
   * to help identify them within vite's stack;
   */
  name?: string;
  /**
   * Path pattern to match for middleware execution.
   * Accepts string or RegExp to filter requests based on URL path.
   *
   * @example
   * // String path
   * path: "/api/v1"
   *
   * // RegExp pattern
   * path: /^\/api\/v[0-9]+/
   */
  path?: string | RegExp;
  /**
   * RPC prefix without leading slash (e.g. "__rpc")
   * Leading slash will be added automatically by the middleware.
   * This prefix defines the base path for all RPC endpoints.
   * @default undefined
   * @example
   * // Results in endpoints like: /api/rpc/myFunction
   * rpcPreffix: "api/rpc"
   */
  rpcPreffix?: string | false;
  /**
   * Custom headers to be set for middleware responses.
   * Use this to add specific headers to all responses handled by this middleware.
   *
   * @example
   * ```ts
   * headers: {
   *   'X-Custom-Header': 'custom-value',
   *   'Cache-Control': 'no-cache'
   * }
   * ```
   */
  headers?: Record<string, string>;
  /**
   * Async handler for request processing.
   * Core middleware function that processes incoming requests.
   *
   * @param req - The incoming request object
   * @param res - The server response object
   * @param next - Function to pass control to the next middleware
   *
   * @example
   * handler: async (req, res, next) => {
   *   // Process request
   *   const data = await processRequest(req);
   *
   *   // Send response
   *   sendResponse(res, { data }, 200);
   * }
   */
  handler?: FrameworkHooks[A]["handler"];
  /**
   * Custom error handling hook for RPC middleware errors.
   * Allows you to handle errors in a custom way instead of the default error response.
   *
   * @param error - The error thrown during request processing
   * @param req - The incoming request object
   * @param res - The server response object
   *
   * @example
   * ```ts
   * onError: (error, req, res) => {
   *   console.error(`[${new Date().toISOString()}] Error:`, error);
   *   // Custom error handling logic
   *   sendResponse(res, { error: "Custom error message" }, 500));
   * }
   * ```
   */
  onError?: FrameworkHooks[A]["onError"];
  /**
   * Hook executed before processing each RPC request.
   * Useful for request validation, logging, or custom authentication.
   * Must return void or a Promise that resolves to void.
   *
   * @param req - The incoming request object
   *
   * @example
   * ```ts
   * onRequest: async (req) => {
   *   // Log incoming requests
   *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
   *
   *   // Add custom validation
   *   const apiKey = req.headers['x-api-key'];
   *   if (!apiKey) throw new Error('Missing API key');
   * }
   * ```
   */
  onRequest?: FrameworkHooks[A]["onRequest"];
  /**
   * Hook executed before sending each RPC response.
   * Useful for response modification, logging, or adding custom headers.
   * Must return void or a Promise that resolves to void.
   *
   * @param res - The server response object
   *
   * @example
   * ```ts
   * onResponse: async (res) => {
   *   // Add custom headers
   *   res.setHeader('X-Response-Time', Date.now());
   *
   *   // Log response metadata
   *   console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
   * }
   * ```
   */
  onResponse?: FrameworkHooks[A]["onResponse"];
}
//#endregion
//#region src/express/types.d.ts
type ExpressMiddlewareOptions = MiddlewareOptions<"express">;
type ExpressMiddlewareFn = <A extends RpcPluginOptions$1["adapter"] = "express">(initialOptions: Partial<MiddlewareOptions<A>>) => ExpressMiddlewareHooks["handler"];
interface ExpressMiddlewareHooks {
  handler: (req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse, next: Connect.NextFunction | NextFunction) => Promise<void>;
  onError: (error: unknown, req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse) => Promise<void>;
  onRequest: (req: IncomingMessage | ExpressRequest) => Promise<void>;
  onResponse: (res: ServerResponse | ExpressResponse) => Promise<void>;
}
//#endregion
//#region src/express/createMiddleware.d.ts
declare const createMiddleware: ExpressMiddlewareFn;
declare const createRPCMiddleware: ExpressMiddlewareFn;
//#endregion
//#region src/express/helpers.d.ts
declare const readBody: (req: Request | IncomingMessage$1) => Promise<BodyResult>;
declare const isExpressRequest: (req: IncomingMessage$1 | Request) => req is Request;
declare const isExpressResponse: (res: ServerResponse$1 | Response$1) => res is Response$1;
declare const getRequestDetails: (request: Request | IncomingMessage$1) => {
  url: string;
  search: string;
  searchParams: URLSearchParams;
  headers: node_http0.IncomingHttpHeaders;
  method: string | undefined;
};
declare const getResponseDetails: (response: Response$1 | ServerResponse$1) => {
  isResponseSent: boolean;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  setStatusCode: (code: number) => void;
  sendResponse: (code: number, output: Record<string, JsonValue>) => void;
};
//#endregion
export { ExpressMiddlewareFn, ExpressMiddlewareHooks, ExpressMiddlewareOptions, createMiddleware, createRPCMiddleware, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, readBody };
//# sourceMappingURL=express.d.mts.map