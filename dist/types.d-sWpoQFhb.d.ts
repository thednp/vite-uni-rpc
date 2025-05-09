import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, Response } from 'express';
import { Connect } from 'vite';
import { CorsOptions } from 'cors';

// vite-mini-rpc/src/types.d.ts
interface ServerFunctionOptions {
  ttl: number;
  invalidateKeys: string | RegExp | RegExp[] | string[];
}

// primitives and their compositions
type JsonPrimitive = string | number | boolean | null | undefined;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue | JsonArray };
type JsonValue = JsonPrimitive | JsonArray | JsonObject; // for email addresses

type RPCValue =
  | JsonValue
  | Date // will be serialized as ISOString
  | Uint8Array // will be serialized as base64
  | File // for file uploads
  | Blob // for binary data
  | FormData // for form submissions
  | URLSearchParams; // for query parameters

type Arguments =
  | RPCValue
  | Array<JsonPrimitive | JsonPrimitive[] | JsonObject | JsonObject[]>;

type ServerFnEntry<
  TArgs extends Arguments[] = Arguments[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult>;

interface ServerFunction<
  TArgs extends Arguments[] = Arguments[],
  TResult = unknown,
> {
  name: string;
  fn: ServerFnEntry<TArgs, TResult>;
  options?: ServerFunctionOptions;
}

/**
 * ### vite-mini-rpc
 * The plugin configuration allows for granular control of your
 * application RPC calls. The default settings are optimized for development
 * environments while providing a secure foundation for production use.
 */
interface RpcPluginOptions {
  // Security Middlewares
  /**
   * Option to disable by setting `false` or customize the cors middleware.
   * When creating a middleware with special headers, it's a good idea to
   * include them into the cors `allowedHeaders` option.
   * @default
   * ```
   * {
   *  origin: true, // allows all origins in development
   *  credentials: true,
   *  methods: ["GET", "POST"],
   *  allowedHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"]
   * }
   * ```
   * @security For production environments, it's recommended to set a specific origin:
   * ```
   *  origin: "https://your-site.com",
   *  // or ["https://site1.com", "https://site2.com"]
   * ```
   */
  cors?: CorsOptions | false;

  /**
   * Option to disable by setting `false` or customize CSRF middleware.
   * This middleware is required for RPC endpoints security.
   * @default
   * ```
   * {
   *  expires: 24,
   *  HttpOnly: true,
   *  Secure: true,
   *  SameSite: "Strict",
   *  Path: "/"
   * }
   * ```
   */
  csrf?: CSRFMiddlewareOptions | false;

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
  headers?: MiddlewareOptions["headers"];

  /**
   * Option to disable by setting `false` or customize RPC rate limiting.
   * Protects your RPC endpoints from abuse by limiting request frequency.
   * @default
   * ```
   * { max: 100, windowMs: 5 * 60 * 1000 }
   * // translates to 100 requests for each 5 minutes
   * ```
   */
  rateLimit?: MiddlewareOptions["rateLimit"] | false; // false to disable

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
  onError?: MiddlewareOptions["onError"];

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
  onRequest?: MiddlewareOptions["onRequest"];

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
   *   if (isExpressResponse(res)) {
   *     res.set('X-Response-Time', Date.now());
   *   } else {
   *     res.setHeader('X-Response-Time', Date.now());
   *   }
   *
   *   // Log response metadata
   *   console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
   * }
   * ```
   */
  onResponse?: MiddlewareOptions["onResponse"];
}

/**
 * Options for the token used by CSRF middleware
 */
type TokenOptions = {
  expires: string;
  HttpOnly: boolean | "true";
  Secure: boolean | "true";
  SameSite: string | "Strict";
  Path: string;
};

type CSRFMiddlewareOptions = Omit<TokenOptions, "expires"> & {
  /**
   * number of hours till expiry
   * @default 24
   */
  expires: number;
};

interface MiddlewareOptions {
  /**
   * Path pattern to match for middleware execution.
   * Accepts string or RegExp to filter requests based on URL path.
   *
   * @example
   * ```ts
   * // String path
   * path: "/api/v1"
   *
   * // RegExp pattern
   * path: /^\/api\/v[0-9]+/
   * ```
   */
  path?: string | RegExp;

  /**
   * Async handler for request processing.
   * Core middleware function that processes incoming requests.
   *
   * @param req - The incoming request object
   * @param res - The server response object
   * @param next - Function to pass control to the next middleware
   *
   * @example
   * ```ts
   * handler: async (req, res, next) => {
   *   // Process request
   *   const data = await processRequest(req);
   *
   *   // Send response
   *   sendResponse(res, { data }, 200);
   * }
   * ```
   */
  handler?: (
    req: IncomingMessage | Request,
    res: ServerResponse | Response,
    next: Connect.NextFunction,
  ) => unknown;

  /**
   * RPC prefix without leading slash (e.g. "__rpc")
   * Leading slash will be added automatically by the middleware.
   * This prefix defines the base path for all RPC endpoints.
   * @default undefined
   * @example
   * // Results in endpoints like: /api/rpc/myFunction
   * rpcPreffix: "api/rpc"
   */
  rpcPreffix?: string;

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
   * Option to disable by setting `false` or customize RPC rate limiting.
   * Protects your RPC endpoints from abuse by limiting request frequency.
   * @default
   * ```
   * { max: 100, windowMs: 5 * 60 * 1000 }
   * // translates to 100 requests for each 5 minutes
   * ```
   */
  rateLimit?: {
    windowMs: number;
    max: number;
  } | false;

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
  onError?: (error: Error, req: IncomingMessage, res: ServerResponse) => void;

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
  onRequest?: (req: Request | IncomingMessage) => void | Promise<void>;

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
  onResponse?: (res: Response | ServerResponse) => void | Promise<void>;
}

export type { Arguments as A, CSRFMiddlewareOptions as C, MiddlewareOptions as M, RpcPluginOptions as R, ServerFnEntry as S, TokenOptions as T, ServerFunctionOptions as a, ServerFunction as b };
