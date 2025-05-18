import { F as FastifyMiddlewareFn, B as BodyResult } from './types.d-BHfEgPGZ.js';
export { g as FastifyMiddlewareHooks, f as FastifyMiddlewareOptions, h as RpcFastifyPluginOptions } from './types.d-BHfEgPGZ.js';
import { FastifyRequest } from 'fastify';
import 'vite';
import 'hono';

declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;

declare const readBody: (req: FastifyRequest) => Promise<BodyResult>;

export { FastifyMiddlewareFn, createMiddleware, createRPCMiddleware, readBody };
