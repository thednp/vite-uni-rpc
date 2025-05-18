import { F as FastifyMiddlewareFn, B as BodyResult } from './types.d-D2uBkBK0.cjs';
export { f as FastifyMiddlewareHooks, e as FastifyMiddlewareOptions, g as RpcFastifyPluginOptions } from './types.d-D2uBkBK0.cjs';
import { FastifyRequest } from 'fastify';
import 'vite';
import 'hono';
import 'node:buffer';

declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;

declare const readBody: (req: FastifyRequest) => Promise<BodyResult>;

export { FastifyMiddlewareFn, createMiddleware, createRPCMiddleware, readBody };
