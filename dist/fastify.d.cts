import { F as FastifyMiddlewareFn, B as BodyResult } from './types.d-DSKMH2Du.cjs';
export { h as FastifyMiddlewareHooks, i as FastifyMiddlewareOptions, j as RpcFastifyPluginOptions } from './types.d-DSKMH2Du.cjs';
import { FastifyRequest } from 'fastify';
import 'vite';
import 'hono';

declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;

declare const readBody: (req: FastifyRequest) => Promise<BodyResult>;

export { FastifyMiddlewareFn, createMiddleware, createRPCMiddleware, readBody };
