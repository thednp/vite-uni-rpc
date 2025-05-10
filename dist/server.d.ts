import { A as Arguments, S as ServerFnEntry, a as ServerFunctionOptions, C as CSRFMiddlewareOptions, M as MiddlewareOptions, b as AnyRequest, c as AnyResponse, T as TokenOptions, d as ServerFunction, F as FrameworkRequest, e as FrameworkResponse, J as JsonValue, R as RpcPluginOptions } from './types.d-CFwCzSF4.js';
import cors from 'cors';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, Response } from 'express';
import { Connect, ResolvedConfig, ViteDevServer } from 'vite';
import * as querystring from 'querystring';
import * as http from 'http';
import '@types/express';
import '@types/cors';

declare function createServerFunction<TArgs extends Arguments[] = Arguments[], TResult = unknown>(name: string, fn: ServerFnEntry<TArgs, TResult>, initialOptions?: Partial<ServerFunctionOptions>): ServerFnEntry<TArgs, TResult>;

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
declare const createCSRF: (initialOptions?: Partial<CSRFMiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse | Response, next: Connect.NextFunction) => void;

declare const createMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: AnyRequest, res: AnyResponse, next: Connect.NextFunction) => Promise<void>;
declare const createRPCMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: AnyRequest, res: AnyResponse, next: Connect.NextFunction) => Promise<void>;

declare function getCookies(req: AnyRequest): querystring.ParsedUrlQuery;
declare function setSecureCookie(res: AnyResponse, name: string, value: string, options?: Partial<TokenOptions>): void;

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

declare const serverFunctionsMap: Map<string, ServerFunction<Arguments[], unknown>>;
declare const isNodeRequest: (req: AnyRequest) => req is IncomingMessage;
declare const isHonoRequest: (req: AnyRequest) => req is {
    raw: IncomingMessage;
};
declare const isExpressRequest: (req: AnyRequest) => req is Request;
declare const isNodeResponse: (res: AnyResponse) => res is ServerResponse;
declare const isHonoResponse: (res: AnyResponse) => res is {
    raw: ServerResponse;
};
declare const isExpressResponse: (res: AnyResponse) => res is Response;
declare const getRequestDetails: (request: FrameworkRequest) => {
    nodeRequest: IncomingMessage;
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
    method: string | undefined;
};
declare const getResponseDetails: (response: FrameworkResponse) => {
    nodeResponse: ServerResponse<IncomingMessage>;
    isResponseSent: boolean;
    setHeader: (name: string, value: string) => void;
    getHeader: (name: string) => string | number | string[] | undefined;
    statusCode: number;
    setStatusCode: (code: number) => void;
    send: (output: Record<string, string | unknown>) => void;
    sendResponse: (code: number, output: Record<string, JsonValue>, contentType?: string) => void;
};
declare const readBody: (req: Request | IncomingMessage) => Promise<string>;
declare const functionMappings: Map<string, string>;
type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
    server?: Partial<ResolvedConfig["server"]>;
};
declare const scanForServerFiles: (initialCfg?: ScanConfig, devServer?: ViteDevServer) => Promise<void>;
declare const sendResponse: (res: ServerResponse | Response, output: Record<string, string | number>, statusCode?: number) => Response<any, Record<string, any>> | undefined;
declare const getClientModules: (options: RpcPluginOptions) => string;

export { createCSRF, createCors, createMiddleware, createRPCMiddleware, createServerFunction, functionMappings, getClientModules, getCookies, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, isHonoRequest, isHonoResponse, isNodeRequest, isNodeResponse, readBody, scanForServerFiles, sendResponse, serverFunctionsMap, setSecureCookie, useSession };
