import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-C4EV56Ih.js';
import 'node:http';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { rpcPlugin as default };
