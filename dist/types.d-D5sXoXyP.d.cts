import { IncomingMessage, ServerResponse } from 'node:http';

// vite-mini-rpc/src/types.d.ts
interface ServerFunctionOptions {
  ttl?: number;
  invalidateKeys?: string | RegExp | RegExp[] | string[];
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

interface RpcPluginOptions {
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

type CSRFTokenOptions = {
  expires: string,
  HttpOnly: boolean | "true",
  Secure: boolean | "true",
  SameSite: string | "Strict",
  Path: string,
}

type CSRFMiddlewareOptions = Omit<CSRFTokenOptions, "expires"> & {
  /**
   * number of days till expiry
   * @default 24
   */
  expires: number;
}

interface MiddlewareOptions {
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
  /** Response transformation */
  transform?: (data: unknown, req: IncomingMessage, res: ServerResponse) => unknown;
  /** Error handling */
  onError?: (error: Error, req: IncomingMessage, res: ServerResponse) => void;
}

export type { Arguments as A, CSRFMiddlewareOptions as C, MiddlewareOptions as M, RpcPluginOptions as R, ServerFnEntry as S, ServerFunctionOptions as a, CSRFTokenOptions as b };
