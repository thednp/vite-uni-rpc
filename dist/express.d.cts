import { E as ExpressMiddlewareFn, B as BodyResult, J as JsonValue } from './types.d-CFin5vbM.cjs';
export { d as ExpressMiddlewareHooks, c as ExpressMiddlewareOptions } from './types.d-CFin5vbM.cjs';
import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, Response } from 'express';
import 'vite';
import 'hono';
import 'fastify';
import 'node:buffer';

declare const createMiddleware: ExpressMiddlewareFn;
declare const createRPCMiddleware: ExpressMiddlewareFn;

declare const readBody: (req: Request | IncomingMessage) => Promise<BodyResult>;
declare const isExpressRequest: (req: IncomingMessage | Request) => req is Request;
declare const isExpressResponse: (res: ServerResponse | Response) => res is Response;
declare const getRequestDetails: (request: Request | IncomingMessage) => {
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
    method: string | undefined;
};
declare const getResponseDetails: (response: Response | ServerResponse) => {
    isResponseSent: boolean;
    setHeader: (name: string, value: string) => void;
    statusCode: number;
    setStatusCode: (code: number) => void;
    sendResponse: (code: number, output: Record<string, JsonValue>) => void;
};

export { ExpressMiddlewareFn, createMiddleware, createRPCMiddleware, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, readBody };
