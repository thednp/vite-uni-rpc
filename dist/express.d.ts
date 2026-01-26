import { E as ExpressMiddlewareFn, d as JsonValue, B as BodyResult } from './types.d-DSKMH2Du.js';
export { f as ExpressMiddlewareHooks, g as ExpressMiddlewareOptions } from './types.d-DSKMH2Du.js';
import * as node_http from 'node:http';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, Response } from 'express';
import 'vite';
import 'hono';
import 'fastify';

declare const createMiddleware: ExpressMiddlewareFn;
declare const createRPCMiddleware: ExpressMiddlewareFn;

declare const readBody: (req: Request | IncomingMessage) => Promise<BodyResult>;
declare const isExpressRequest: (req: IncomingMessage | Request) => req is Request;
declare const isExpressResponse: (res: ServerResponse | Response) => res is Response;
declare const getRequestDetails: (request: Request | IncomingMessage) => {
    url: string;
    search: string;
    searchParams: URLSearchParams;
    headers: node_http.IncomingHttpHeaders;
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
