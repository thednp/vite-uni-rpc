import { A as Arguments, S as ServerFnEntry, b as ServerFunctionOptions, C as CSRFMiddlewareOptions, M as MiddlewareOptions, T as TokenOptions, c as ServerFunction, R as RpcPluginOptions } from './types.d-D_cWYucW.cjs';
import cors from 'cors';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, Response } from 'express';
import { Connect, ResolvedConfig, ViteDevServer } from 'vite';
import * as querystring from 'querystring';

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

declare const createMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;
declare const createRPCMiddleware: (initialOptions?: Partial<MiddlewareOptions>) => (req: IncomingMessage | Request, res: ServerResponse<IncomingMessage>, next: Connect.NextFunction) => Promise<void>;

declare function getCookies(req: Request | IncomingMessage): querystring.ParsedUrlQuery;
declare function setSecureCookie(res: ServerResponse | Response, name: string, value: string, options?: Partial<TokenOptions>): void;

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
declare const isExpressRequest: (r: Request | IncomingMessage) => r is Request;
declare const isExpressResponse: (r: Response | ServerResponse) => r is Response;
/**
 * Resolve file extension.
 * @param filePath
 * @param extensions default [".tsx", ".jsx", ".ts", ".js"]
 */
declare const resolveExtension: (filePath: string, extensions?: string[]) => string;
/**
 * Returns the current project vite configuration, more specifically
 * the `ResolvedConfig`.
 */
declare const getViteConfig: () => Promise<ResolvedConfig>;
declare const getRPCPluginConfig: () => Promise<RpcPluginOptions | undefined>;
declare const readBody: (req: Request | IncomingMessage) => Promise<string>;
declare const functionMappings: Map<string, string>;
type ScanConfig = Pick<ResolvedConfig, "root" | "base"> & {
    server?: Partial<ResolvedConfig["server"]>;
};
declare const scanForServerFiles: (initialCfg?: ScanConfig, devServer?: ViteDevServer) => Promise<void>;
declare const sendResponse: (res: ServerResponse | Response, response: Record<string, string | unknown>, statusCode?: number) => Response<any, Record<string, any>> | undefined;
declare const getClientModules: (options: RpcPluginOptions) => string;

export { createCSRF, createCors, createMiddleware, createRPCMiddleware, createServerFunction, functionMappings, getClientModules, getCookies, getRPCPluginConfig, getViteConfig, isExpressRequest, isExpressResponse, readBody, resolveExtension, scanForServerFiles, sendResponse, serverFunctionsMap, setSecureCookie, useSession };
