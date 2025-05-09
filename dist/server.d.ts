import { A as Arguments, S as ServerFnEntry, a as ServerFunctionOptions, C as CSRFMiddlewareOptions, M as MiddlewareOptions, b as CSRFTokenOptions } from './types.d-C4EV56Ih.js';
import * as cors from 'cors';
import cors__default from 'cors';
import { IncomingMessage, ServerResponse } from 'node:http';
import * as express from 'express';
import { Request, Response } from 'express';
import * as vite from 'vite';
import { Connect } from 'vite';
import * as http from 'http';
import * as querystring from 'querystring';

declare function createServerFunction<TArgs extends Arguments[] = Arguments[], TResult = unknown>(name: string, fn: ServerFnEntry<TArgs, TResult>, initialOptions?: ServerFunctionOptions): ServerFnEntry<TArgs, TResult>;

/**
 * Create a Cross-Origin Resource Sharing (CORS) middleware
 * @param initialOptions
 * @returns a new cors middleware
 */
declare const createCors: (initialOptions?: Partial<cors__default.CorsOptions>) => (req: cors__default.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;

/**
 * Create a Cross Site Request Forgery (CSRF) middleware
 * @param initialOptions
 * @returns a new CSRF middleware
 */
declare const createCSRF: (initialOptions?: Partial<CSRFMiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse | Response, next: Connect.NextFunction) => void;

declare const createMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;
declare const createRPCMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;

declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;

declare const csrfMiddleware: (req: http.IncomingMessage | express.Request, res: http.ServerResponse | express.Response, next: vite.Connect.NextFunction) => void;

declare const rpcMiddleware: (req: http.IncomingMessage | express.Request, res: http.ServerResponse<http.IncomingMessage>, next: vite.Connect.NextFunction) => Promise<void>;

declare function getCookies(req: Request | IncomingMessage): querystring.ParsedUrlQuery;
declare function setSecureCookie(res: ServerResponse | Response, name: string, value: string, options?: Partial<CSRFTokenOptions>): void;

interface Session {
    id: string;
    userId?: string | number;
    createdAt: Date;
    expiresAt: Date;
    data: Record<string, unknown>;
}
declare class SessionManager {
    private sessions;
    createSession(userId?: string, duration?: number): Session;
    getSession(id: string): Session | null;
}
declare const useSession: () => SessionManager;

export { corsMiddleware, createCSRF, createCors, createMiddleware, createRPCMiddleware, createServerFunction, csrfMiddleware, getCookies, rpcMiddleware, setSecureCookie, useSession };
