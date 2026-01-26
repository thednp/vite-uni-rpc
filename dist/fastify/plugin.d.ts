import { FastifyInstance } from 'fastify';
import { M as MiddlewareOptions } from '../types.d-DSKMH2Du.js';
import 'vite';
import 'hono';

declare const fastifyRpcPlugin: (fastify: FastifyInstance, initialOptions: Partial<MiddlewareOptions<"fastify">> | undefined, done: () => void) => void;

export { fastifyRpcPlugin as default };
