import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-CUBrZuN1.js';
import 'node:http';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { rpcPlugin as default };
