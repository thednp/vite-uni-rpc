import { A as Arguments, S as ServerFnEntry, a as ServerFunctionOptions, C as CSRFMiddlewareOptions, M as MiddlewareOptions, b as CSRFTokenOptions } from './types.d-D5sXoXyP.js';
import cors from 'cors';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Connect } from 'vite';
import * as querystring from 'querystring';

declare function createServerFunction<TArgs extends Arguments[] = Arguments[], TResult = unknown>(name: string, fn: ServerFnEntry<TArgs, TResult>, initialOptions?: ServerFunctionOptions): ServerFnEntry<TArgs, TResult>;

/**
 * Create a Cross-Origin Resource Sharing (CORS) middleware
 * @param initialOptions
 * @returns a new cors middleware
 */
declare const createCors: (initialOptions?: Partial<cors.CorsOptions>) => (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;

/**
 * Create a Cross Site Request Forgery (CSRF) middleware
 * @param initialOptions
 * @returns a new CSRF middleware
 */
declare const createCSRF: (initialOptions?: Partial<CSRFMiddlewareOptions>) => (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => void;

declare const createMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;
declare const createRPCMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;

declare function getCookies(cookieHeader: string | undefined): querystring.ParsedUrlQuery;
declare function setSecureCookie(res: ServerResponse, name: string, value: string, options?: Partial<CSRFTokenOptions>): void;

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

export { createCSRF, createCors, createMiddleware, createRPCMiddleware, createServerFunction, getCookies, setSecureCookie, useSession };
