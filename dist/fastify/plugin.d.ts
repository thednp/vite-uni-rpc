import { FastifyInstance } from 'fastify';
import { M as MiddlewareOptions } from '../types.d-BTEF26oe.js';
import 'vite';
import 'hono';
import 'node:buffer';

declare const fastifyRpcPlugin: (fastify: FastifyInstance, initialOptions: Partial<MiddlewareOptions<"fastify">> | undefined, done: () => void) => void;

export { fastifyRpcPlugin as default };
