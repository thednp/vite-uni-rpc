import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-CFwCzSF4.js';
import 'node:http';
import '@types/express';
import '@types/cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;
/**
 * Utility to define `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
declare function defineRPCConfig(config: Partial<RpcPluginOptions>): RpcPluginOptions;
/**
 * Utility to load `vite-mini-rpc` configuration file similar to other
 * popular frameworks like vite.
 * @param configFile
 */
declare function loadRPCConfig(configFile?: string): Promise<{
    cors: {
        origin: true;
        credentials: true;
        methods: string[];
        allowedHeaders: string[];
    };
    csrf: {
        expires: number;
        HttpOnly: true;
        Secure: true;
        SameSite: string;
        Path: string;
    };
    rpcPreffix: string;
    headers: undefined;
    rateLimit: {
        windowMs: number;
        max: number;
    };
    onError: undefined;
    onRequest: undefined;
    onResponse: undefined;
} | Record<string, any>>;

export { RpcPluginOptions, rpcPlugin as default, defineRPCConfig, loadRPCConfig };
