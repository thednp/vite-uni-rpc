import { FastifyInstance } from 'fastify';
import { M as MiddlewareOptions } from '../types.d-CFin5vbM.cjs';
import 'vite';
import 'hono';
import 'node:buffer';

declare const fastifyRpcPlugin: (fastify: FastifyInstance, initialOptions: Partial<MiddlewareOptions<"fastify">> | undefined, done: () => void) => void;

export { fastifyRpcPlugin as default };
