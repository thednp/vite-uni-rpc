import { F as FastifyMiddlewareFn, B as BodyResult } from './types.d-BWNcqI2h.cjs';
export { i as FastifyMiddlewareHooks, h as FastifyMiddlewareOptions, j as RpcFastifyPluginOptions } from './types.d-BWNcqI2h.cjs';
import { FastifyRequest } from 'fastify';
import 'vite';
import 'hono';

declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;

declare const readBody: (req: FastifyRequest) => Promise<BodyResult>;

export { FastifyMiddlewareFn, createMiddleware, createRPCMiddleware, readBody };
