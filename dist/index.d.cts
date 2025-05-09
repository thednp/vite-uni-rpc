import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './utils-BoTUpDy1.cjs';
export { d as defineRPCConfig, l as loadRPCConfig } from './utils-BoTUpDy1.cjs';
import 'node:http';
import 'express';
import 'cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { RpcPluginOptions, rpcPlugin as default };
