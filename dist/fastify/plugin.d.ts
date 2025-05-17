import { FastifyInstance } from 'fastify';
import { M as MiddlewareOptions } from '../types.d-BQsvFMi2.js';
import 'vite';
import 'hono';

declare const fastifyMiniRpcPlugin: (fastify: FastifyInstance, initialOptions: Partial<MiddlewareOptions<"fastify">> | undefined, done: () => void) => void;

export { fastifyMiniRpcPlugin as default };
