import { H as HonoMiddlewareFn } from './types.d-C_r3ksoN.cjs';
export { i as HonoMiddlewareHooks, h as HonoMiddlewareOptions } from './types.d-C_r3ksoN.cjs';
import * as hono from 'hono';
import { ViteDevServer } from 'vite';
import { HttpBindings } from '@hono/node-server';
import 'fastify';

declare const createMiddleware: HonoMiddlewareFn;
declare const createRPCMiddleware: HonoMiddlewareFn;

/**
 * Creates a hono compatible middleware for a given vite development server.
 * @see https://github.com/honojs/hono/issues/3162#issuecomment-2331118049
 * @param vite the vite development server
 */
declare const viteMiddleware: (vite: ViteDevServer) => hono.MiddlewareHandler<{
    Bindings: HttpBindings;
}, string, {}>;

export { HonoMiddlewareFn, createMiddleware, createRPCMiddleware, viteMiddleware };
