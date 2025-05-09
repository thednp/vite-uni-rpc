import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './utils-CHvpVg9J.js';
export { d as defineRPCConfig, l as loadRPCConfig } from './utils-CHvpVg9J.js';
import 'node:http';
import 'express';
import 'cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { RpcPluginOptions, rpcPlugin as default };
