import { Connect, PluginOption } from "vite";
import { MiddlewareOptions as MiddlewareOptions$1, RpcPluginOptions as RpcPluginOptions$1 } from "vite-uni-rpc";
import "express";
import { Context, MiddlewareHandler } from "hono";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";

//#region src/express/types.d.ts
type ExpressMiddlewareFn = <A extends RpcPluginOptions$1["adapter"] = "express">(initialOptions: Partial<MiddlewareOptions$1<A>>) => ExpressMiddlewareHooks["handler"];
interface ExpressMiddlewareHooks {
  handler: (req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse, next: Connect.NextFunction | NextFunction) => Promise<void>;
  onError: (error: unknown, req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse) => Promise<void>;
  onRequest: (req: IncomingMessage | ExpressRequest) => Promise<void>;
  onResponse: (res: ServerResponse | ExpressResponse) => Promise<void>;
}
//#endregion
//#region src/hono/types.d.ts
interface HonoMiddlewareHooks {
  // handler: ((c: Context, next: Next) => Promise<void>);
  handler: MiddlewareHandler;
  onRequest: (c: Context) => Promise<void>;
  onResponse: (c: Context) => Promise<void>;
  onError: (error: unknown, c: Context) => Promise<void>;
}
type HonoMiddlewareFn = <A extends RpcPluginOptions$1["adapter"] = "hono">(initialOptions: Partial<MiddlewareOptions$1<A>>) => HonoMiddlewareHooks["handler"];
//#endregion
//#region src/fastify/types.d.ts
type FastifyMiddlewareFn = <A extends RpcPluginOptions$1["adapter"] = "fastify">(initialOptions?: Partial<MiddlewareOptions$1<A>>) => FastifyMiddlewareHooks["handler"];
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
interface FrameworkMiddlewareFn {
  express: ExpressMiddlewareFn;
  hono: HonoMiddlewareFn;
  fastify: FastifyMiddlewareFn;
}
type SupportableContentType = "multipart/form-data" | "application/json" | "text/plain" | "application/octet-stream";
type ContentType = "application/json" | "text/plain";
type BodyResult = {
  contentType: "application/json";
  data: JsonValue;
} | {
  contentType: "text/plain";
  data: string;
};
interface ServerFunctionOptions {
  ttl: number;
  invalidateKeys: string | RegExp | RegExp[] | string[];
  contentType: ContentType;
}
// primitives and their compositions
type JsonPrimitive = string | number | boolean | null | undefined;
type JsonObject = {
  [key: string]: JsonValue | JsonArray;
};
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
// Keep these as a refference
// Date strings are common in APIs
// export type ISODateString = string; // for dates in ISO format
// Special types that might be useful
// export type Base64String = string; // for binary data encoded as base64
// export type URLString = string; // for URLs
// export type EmailString = string; // for email addresses
// export type RPCValue =
//   | JsonValue
//   | Date // will be serialized as ISOString
//   | Uint8Array // will be serialized as base64
//   | File // for file uploads
//   | Blob // for binary data
//   | URLSearchParams; // for query parameters
// export type ServerFnArgs = [JsonObject | JsonPrimitive, ...JsonArray];
type ServerFnArgs = [...JsonArray];
type ServerFunction<TArgs extends JsonArray = JsonArray, TResult extends JsonValue = JsonValue> = (signal: AbortSignal, ...args: TArgs) => Promise<TResult>;
type ServerFunctionInit<TArgs extends JsonArray = JsonArray, TResult extends JsonValue = JsonValue> = (...args: TArgs) => Promise<TResult>;
type ClientFunction<TArgs extends JsonArray = JsonArray, TResult extends JsonValue = JsonValue> = (...args: TArgs) => {
  data: Promise<TResult>;
  cancel: (reason: string) => void;
};
interface ServerFnEntry {
  name: string;
  fn: ServerFunction<never, never> | ClientFunction<never, never>;
  options?: ServerFunctionOptions;
}
interface CacheEntry<T> {
  data?: T;
  timestamp: number;
  promise?: Promise<T>;
}
/**
 * ### vite-uni-rpc
 * The plugin configuration allows for granular control of your
 * application RPC calls. The default settings are optimized for development
 * environments while providing a secure foundation for production use.
 */
interface RpcPluginOptions {
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
interface MiddlewareOptions<A extends RpcPluginOptions["adapter"] = "express"> {
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
//#region src/index.d.ts
/**
 * Utility to define `vite-uni-rpc` configuration file similar to vite.
 * @param uniConfig a system wide RPC configuration
 */
declare const defineConfig: (uniConfig: Partial<RpcPluginOptions>) => RpcPluginOptions;
/**
 * Utility to load `vite-uni-rpc` configuration file system wide.
 * @param configFile an optional parameter to specify a file within your project scope
 */
declare function loadRPCConfig(configFile?: string): Promise<RpcPluginOptions>;
declare function rpcPlugin(devOptions?: Partial<RpcPluginOptions>): PluginOption;
//#endregion
export { BodyResult, CacheEntry, ClientFunction, ContentType, FrameworkHooks, FrameworkMiddlewareFn, JsonArray, JsonObject, JsonPrimitive, JsonValue, MiddlewareOptions, RpcPluginOptions, ServerFnArgs, ServerFnEntry, ServerFunction, ServerFunctionInit, ServerFunctionOptions, SupportableContentType, rpcPlugin as default, defineConfig, loadRPCConfig };
//# sourceMappingURL=index.d.mts.map