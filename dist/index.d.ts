import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-sWpoQFhb.js';
import 'node:http';
import 'express';
import 'cors';

interface RpcPlugin extends Plugin {
    pluginOptions: RpcPluginOptions;
}
declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): RpcPlugin;

export { rpcPlugin as default };
