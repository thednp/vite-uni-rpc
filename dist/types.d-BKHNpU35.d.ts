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

export type { Arguments as A, RpcPluginOptions as R, ServerFnEntry as S, ServerFunctionOptions as a };
