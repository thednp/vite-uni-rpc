import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-sWpoQFhb.js';
import 'node:http';
import 'express';
import 'cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { rpcPlugin as default };
