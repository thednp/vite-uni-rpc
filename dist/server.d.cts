import { A as Arguments, S as ServerFnEntry, a as ServerFunctionOptions, b as ServerFunction, R as RpcPluginOptions } from './types.d-vHtB4OYe.cjs';
import { ResolvedConfig, ViteDevServer } from 'vite';
import 'express';
import 'hono';
import 'fastify';

declare function createServerFunction<TArgs extends Arguments[] = Arguments[], TResult = unknown>(name: string, fn: ServerFnEntry<TArgs, TResult>, initialOptions?: Partial<ServerFunctionOptions>): ServerFnEntry<TArgs, TResult>;

declare class ServerCache {
    private cache;
    get<T>(key: string, ttl: number | undefined, fetcher: () => Promise<T>): Promise<T>;
    invalidate(pattern?: string | string[] | RegExp | RegExp[]): void;
}
declare const serverCache: ServerCache;

declare const serverFunctionsMap: Map<string, ServerFunction<Arguments[], unknown>>;
declare const functionMappings: Map<string, string>;
type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
    server?: Partial<ResolvedConfig["server"]>;
};
declare const scanForServerFiles: (initialCfg?: ScanConfig, devServer?: ViteDevServer) => Promise<void>;
declare const getClientModules: (options: RpcPluginOptions) => string;

declare const defaultServerFnOptions: {
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
