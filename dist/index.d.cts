import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './types.d-D5sXoXyP.cjs';
import 'node:http';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { rpcPlugin as default };
