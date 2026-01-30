import { Connect } from "vite";
import { BodyResult, JsonValue, MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";
import * as node_http0 from "node:http";
import { IncomingMessage as IncomingMessage$1, ServerResponse as ServerResponse$1 } from "node:http";
import { Request, Response } from "express";

//#region src/express/types.d.ts
type ExpressMiddlewareOptions = MiddlewareOptions<"express">;
type ExpressMiddlewareFn = <A extends RpcPluginOptions["adapter"] = "express">(initialOptions: Partial<MiddlewareOptions<A>>) => ExpressMiddlewareHooks["handler"];
interface ExpressMiddlewareHooks {
  handler: (req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse, next: Connect.NextFunction | NextFunction) => Promise<void>;
  onError: (error: unknown, req: IncomingMessage | ExpressRequest, res: ServerResponse | ExpressResponse) => Promise<void>;
  onRequest: (req: IncomingMessage | ExpressRequest) => Promise<void>;
  onResponse: (res: ServerResponse | ExpressResponse) => Promise<void>;
}
//#endregion
//#region src/express/createMiddleware.d.ts
declare const createMiddleware: ExpressMiddlewareFn;
declare const createRPCMiddleware: ExpressMiddlewareFn;
//#endregion
//#region src/express/helpers.d.ts
declare const readBody: (req: Request | IncomingMessage$1, signal?: AbortSignal) => Promise<BodyResult>;
declare const isExpressRequest: (req: IncomingMessage$1 | Request) => req is Request;
declare const isExpressResponse: (res: ServerResponse$1 | Response) => res is Response;
declare const getRequestDetails: (request: Request | IncomingMessage$1) => {
  url: string;
  search: string;
  searchParams: URLSearchParams;
  headers: node_http0.IncomingHttpHeaders;
  method: string | undefined;
};
declare const getResponseDetails: (response: Response | ServerResponse$1) => {
  isResponseSent: boolean;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  setStatusCode: (code: number) => void;
  sendResponse: (code: number, output: Record<string, JsonValue>) => void;
};
//#endregion
export { ExpressMiddlewareFn, ExpressMiddlewareHooks, ExpressMiddlewareOptions, createMiddleware, createRPCMiddleware, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, readBody };
//# sourceMappingURL=express.d.mts.map