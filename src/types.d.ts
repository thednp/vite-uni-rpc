// vite-mini-rpc/src/types.d.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "@types/express";
import type { CorsOptions } from "@types/cors";
import type { Connect } from "vite";

export interface ServerFunctionOptions {
  ttl: number;
  invalidateKeys: string | RegExp | RegExp[] | string[];
  // contentType: string; // TO DO
}

export type AnyRequest = ExpressRequest | IncomingMessage | {
  raw: IncomingMessage;
} | {
  req: IncomingMessage;
};
export type AnyResponse = ExpressResponse | ServerResponse | {
  raw: ServerResponse;
} | {
  res: ServerResponse;
};

export type FrameworkRequest = {
  raw?: IncomingMessage; // Hono, Fastify
  req?: IncomingMessage; // Koa
  originalUrl?: string; // Express
  url?: string; // Node.js
};

export type FrameworkResponse = {
  raw?: ServerResponse; // Hono, Fastify
  res?: ServerResponse; // Koa
  headersSent?: boolean; // Express
  writableEnded?: boolean; // Node.js
  // Common methods across frameworks
  setHeader?: (
    name: string,
    value: string | number | readonly string[],
  ) => void;
  getHeader?: (name: string) => string | number | string[] | undefined;
  header?: ExpressResponse["header"]; // Express
  set?: ExpressResponse["set"]; // Express
  send?: ExpressResponse["send"]; // Express
  status?: ExpressResponse["status"]; // Express
};

// primitives and their compositions
export type JsonPrimitive = string | number | boolean | null | undefined;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue | JsonArray };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// Date strings are common in APIs
export type ISODateString = string; // for dates in ISO format

// Special types that might be useful
export type Base64String = string; // for binary data encoded as base64
export type URLString = string; // for URLs
export type EmailString = string; // for email addresses

export type RPCValue =
  | JsonValue
  | Date // will be serialized as ISOString
  | Uint8Array // will be serialized as base64
  | File // for file uploads
  | Blob // for binary data
  | FormData // for form submissions
  | URLSearchParams; // for query parameters

export type Arguments =
  | RPCValue
  | Array<JsonPrimitive | JsonPrimitive[] | JsonObject | JsonObject[]>;

export type ServerFnEntry<
  TArgs extends Arguments[] = Arguments[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult>;

export interface ServerFunction<
  TArgs extends Arguments[] = Arguments[],
  TResult = unknown,
> {
  name: string;
  fn: ServerFnEntry<TArgs, TResult>;
  options?: ServerFunctionOptions;
}

export interface CacheEntry<T> {
  data?: T;
  timestamp: number;
  promise?: Promise<T>;
}

/**
 * ### vite-mini-rpc
 * The plugin configuration allows for granular control of your
 * application RPC calls. The default settings are optimized for development
 * environments while providing a secure foundation for production use.
 */
export interface RpcPluginOptions {
  // Security Middlewares
  /**
   * Option to disable by setting `false` or customize the cors middleware.
   * When creating a middleware with special headers, it's a good idea to
   * include them into the cors `allowedHeaders` option.
   * @default
   * {
   *  origin: true, // allows all origins in development
   *  credentials: true,
   *  methods: ["GET", "POST"],
   *  allowedHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"]
   * }
   * @security For production environments, it's recommended to set a specific origin:
   * { origin: "https://your-site.com" }
   *  // or ["https://site1.com", "https://site2.com"]
   */
  cors?: Partial<CorsOptions> | false;

  /**
   * Option to disable by setting `false` or customize CSRF middleware.
   * This middleware is **required** for RPC endpoints security.
   * @default
   * {
   *  expires: 24,
   *  HttpOnly: true,
   *  Secure: true,
   *  SameSite: "Strict",
   *  Path: "/"
   * }
   */
  csrf?: Partial<CSRFMiddlewareOptions> | false;

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
   * The most popular and battle tested server app is express
   * and is the default adapter.
   */
  adapter: "express";

  /**
   * Custom headers to be set for middleware responses.
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
   * Option to disable by setting `false` or customize RPC rate limiting.
   * Protects your RPC endpoints from abuse by limiting request frequency.
   * @default
   * { max: 100, windowMs: 5 * 60 * 1000 }
   * // translates to 100 requests for each 5 minutes
   */
  rateLimit?: Partial<MiddlewareOptions["rateLimit"]> | false; // false to disable

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
   */
  onResponse?: MiddlewareOptions["onResponse"];
}

/**
 * Options for the token used by CSRF middleware
 */
export type TokenOptions = {
  expires: string;
  HttpOnly: boolean | "true";
  Secure: boolean | "true";
  SameSite: string | "Strict";
  Path: string;
};

export type CSRFMiddlewareOptions = Omit<TokenOptions, "expires"> & {
  /**
   * number of hours till expiry
   * @default 24
   */
  expires: number;
  rpcPreffix?: string;
};

export interface MiddlewareOptions {
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
  handler?: (
    req: AnyRequest,
    res: AnyResponse,
    next: NextFunction | Connect.NextFunction,
  ) => void;
  // handler?: <Q, S, N>(
  //   req: Q,
  //   res: S,
  //   next: N,
  // ) => void;

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
   * Option to disable by setting `false` or customize RPC rate limiting.
   * Protects your RPC endpoints from abuse by limiting request frequency.
   * @default
   * ```
   * { max: 100, windowMs: 5 * 60 * 1000 }
   * // translates to 100 requests for each 5 minutes
   * ```
   */
  rateLimit?: {
    windowMs?: number;
    max?: number;
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
  onError?: (error: Error, req: AnyRequest, res: AnyResponse) => void;

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
  onRequest?: (req: AnyRequest) => void | Promise<void>;

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
  onResponse?: (res: AnyResponse) => void | Promise<void>;
}
