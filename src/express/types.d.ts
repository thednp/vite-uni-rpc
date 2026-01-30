import type { Connect } from "vite";
import type { MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";

export type ExpressMiddlewareOptions = MiddlewareOptions<"express">;

export type ExpressMiddlewareFn = <
  A extends RpcPluginOptions["adapter"] = "express",
>(
  initialOptions: Partial<MiddlewareOptions<A>>,
) => ExpressMiddlewareHooks["handler"];

export interface ExpressMiddlewareHooks {
  handler: (
    req: IncomingMessage | ExpressRequest,
    res: ServerResponse | ExpressResponse,
    next: Connect.NextFunction | NextFunction,
  ) => Promise<void>;
  onError: (
    error: unknown,
    req: IncomingMessage | ExpressRequest,
    res: ServerResponse | ExpressResponse,
  ) => Promise<void>;
  onRequest: (req: IncomingMessage | ExpressRequest) => Promise<void>;
  onResponse: (res: ServerResponse | ExpressResponse) => Promise<void>;
}
