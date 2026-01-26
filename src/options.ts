import type {
  MiddlewareOptions,
  RpcPluginOptions,
  ServerFunctionOptions,
} from "./types.d.ts";

export const defaultServerFnOptions = {
  contentType: "application/json",
  ttl: 10 * 1000, // 10s
  invalidateKeys: [],
} satisfies ServerFunctionOptions;

export const defaultRPCOptions = {
  rpcPreffix: "__rpc",
  adapter: "express",
  headers: undefined,
  onError: undefined,
  onRequest: undefined,
  onResponse: undefined,
} satisfies RpcPluginOptions;

export const defaultMiddlewareOptions = {
  // rpcPreffix: defaultRPCOptions.rpcPreffix,
  rpcPreffix: undefined,
  path: undefined,
  headers: {} as Record<string, string>,
  handler: undefined,
  onError: undefined,
  onRequest: undefined,
  onResponse: undefined,
} satisfies MiddlewareOptions;
