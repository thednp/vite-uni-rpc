import { S as ServerFnEntry, a as ServerFnArgs, b as ServerFunctionOptions, J as JsonPrimitive, c as JsonObject, d as JsonValue, R as RpcPluginOptions, e as ServerFunction } from './types.d-DSKMH2Du.js';
import { ResolvedConfig, ViteDevServer } from 'vite';
import 'hono';
import 'fastify';

declare function createServerFunction<TResult = unknown>(name: string, fn: ServerFnEntry<ServerFnArgs, TResult>, initialOptions?: Partial<ServerFunctionOptions>): (args_0: JsonPrimitive | JsonObject, ...args: JsonValue[]) => Promise<TResult>;

declare class ServerCache {
    private cache;
    get<T>(key: string, ttl: number | undefined, fetcher: () => Promise<T>): Promise<T>;
    invalidate(pattern?: string | string[] | RegExp | RegExp[]): void;
}
declare const serverCache: ServerCache;

declare const serverFunctionsMap: Map<string, ServerFunction>;
declare const functionMappings: Map<string, string>;
type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
    server?: Partial<ResolvedConfig["server"]>;
};
declare const scanForServerFiles: (initialCfg?: ScanConfig, devServer?: ViteDevServer) => Promise<void>;
declare const getClientModules: (initialOptions: RpcPluginOptions) => string;

declare const defaultServerFnOptions: {
    contentType: "application/json";
    ttl: number;
    invalidateKeys: never[];
};
declare const defaultRPCOptions: {
    rpcPreffix: string;
    adapter: "express";
    headers: undefined;
    onError: undefined;
    onRequest: undefined;
    onResponse: undefined;
};
declare const defaultMiddlewareOptions: {
    rpcPreffix: undefined;
    path: undefined;
    headers: Record<string, string>;
    handler: undefined;
    onError: undefined;
    onRequest: undefined;
    onResponse: undefined;
};

export { ServerCache, createServerFunction, defaultMiddlewareOptions, defaultRPCOptions, defaultServerFnOptions, functionMappings, getClientModules, scanForServerFiles, serverCache, serverFunctionsMap };
