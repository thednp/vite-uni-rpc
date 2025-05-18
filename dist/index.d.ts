import * as rollup from 'rollup';
import { ResolvedConfig, ViteDevServer } from 'vite';
import { R as RpcPluginOptions } from './types.d-BWNcqI2h.js';
import 'hono';
import 'fastify';

/**
 * Utility to define `vite-uni-rpc` configuration file similar to vite.
 * @param uniConfig a system wide RPC configuration
 */
declare const defineConfig: (uniConfig: Partial<RpcPluginOptions>) => RpcPluginOptions;
/**
 * Utility to load `vite-uni-rpc` configuration file system wide.
 * @param configFile an optional parameter to specify a file within your project scope
 */
declare function loadRPCConfig(configFile?: string): Promise<RpcPluginOptions>;
declare function rpcPlugin(devOptions?: Partial<RpcPluginOptions>): {
    name: string;
    enforce: "pre";
    configResolved(this: void, resolvedConfig: ResolvedConfig): Promise<void>;
    buildStart(this: rollup.PluginContext): Promise<void>;
    transform(this: rollup.TransformPluginContext, code: string, id: string, ops?: {
        ssr?: boolean;
    }): Promise<{
        code: string;
        map: null;
    } | null>;
    configureServer(this: void, server: ViteDevServer): void;
};

export { RpcPluginOptions, rpcPlugin as default, defineConfig, loadRPCConfig };
