import { R as RpcPluginOptions, a as RpcPlugin } from './types.d-D_cWYucW.js';
import 'node:http';
import 'express';
import 'vite';
import 'cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): RpcPlugin;

export { rpcPlugin as default };
