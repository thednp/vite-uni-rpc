import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-CiWuDOP1.cjs';
import 'express';
import 'hono';
import 'fastify';

/**
 * Utility to define `vite-mini-rpc` configuration file similar to vite.
 * @param uniConfig a system wide RPC configuration
 */
declare const defineConfig: (uniConfig: Partial<RpcPluginOptions>) => RpcPluginOptions;
/**
 * Utility to load `vite-mini-rpc` configuration file system wide.
 * @param configFile an optional parameter to specify a file within your project scope
 */
declare function loadRPCConfig(configFile?: string): Promise<RpcPluginOptions>;
declare function rpcPlugin(devOptions?: Partial<RpcPluginOptions>): Promise<Plugin>;

export { RpcPluginOptions, rpcPlugin as default, defineConfig, loadRPCConfig };
