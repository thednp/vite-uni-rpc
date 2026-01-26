import { H as HonoMiddlewareFn, B as BodyResult } from './types.d-DSKMH2Du.js';
export { k as HonoMiddlewareHooks, l as HonoMiddlewareOptions } from './types.d-DSKMH2Du.js';
import * as hono from 'hono';
import { Context } from 'hono';
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
}, string, {}, Response>;
declare const readBody: (c: Context) => Promise<BodyResult>;

export { HonoMiddlewareFn, createMiddleware, createRPCMiddleware, readBody, viteMiddleware };
