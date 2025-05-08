import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect } from "vite";

// vite-mini-rpc/src/types.d.ts
export interface ServerFunctionOptions {
  ttl?: number;
  invalidateKeys?: string | RegExp | RegExp[] | string[];
}

// primitives and their compositions
type JsonPrimitive = string | number | boolean | null | undefined;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue | JsonArray };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// Date strings are common in APIs
type ISODateString = string; // for dates in ISO format

// Special types that might be useful
type Base64String = string; // for binary data encoded as base64
type URLString = string; // for URLs
type EmailString = string; // for email addresses

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

export interface RpcPluginOptions {
  /**
   * RPC calls are called to this base URL
   * @default {"__rpc"}
   */
  rpcPrefix: "string";
  /**
   * Time to live
   * @default {10000} */
  ttl: number;
}

export type CSRFTokenOptions = {
  expires: string;
  HttpOnly: boolean | "true";
  Secure: boolean | "true";
  SameSite: string | "Strict";
  Path: string;
};

export type CSRFMiddlewareOptions = Omit<CSRFTokenOptions, "expires"> & {
  /**
   * number of days till expiry
   * @default 24
   */
  expires: number;
};

export interface MiddlewareOptions {
  /** RPC endpoint prefix */
  rpcPrefix?: string;
  /** Path pattern to match for middleware execution */
  path?: string | RegExp;
  /** Custom headers to set */
  headers?: Record<string, string>;
  /** Rate limiting */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  /** Async handler for request processing */
  handler?: (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) => unknown;
  // transform?: (data: unknown, req: IncomingMessage, res: ServerResponse) => unknown;
  /** Error handling */
  onError?: (error: Error, req: IncomingMessage, res: ServerResponse) => void;
}
