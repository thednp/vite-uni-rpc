import { Plugin } from 'vite';
import { R as RpcPluginOptions } from './utils-B6drRPIQ.js';
export { d as defineRPCConfig, l as loadRPCConfig } from './utils-B6drRPIQ.js';
import 'node:http';
import 'express';
import '@types/express';
import '@types/cors';

declare function rpcPlugin(initialOptions?: Partial<RpcPluginOptions>): Plugin;

export { RpcPluginOptions, rpcPlugin as default };
