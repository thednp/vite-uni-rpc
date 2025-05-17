import { F as FastifyMiddlewareFn } from './types.d-C_r3ksoN.js';
export { f as FastifyMiddlewareHooks, e as FastifyMiddlewareOptions, g as RpcFastifyPluginOptions } from './types.d-C_r3ksoN.js';
import 'vite';
import 'hono';
import 'fastify';

declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;

export { FastifyMiddlewareFn, createMiddleware, createRPCMiddleware };
