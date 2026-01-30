import type { Context, MiddlewareHandler, Next } from "hono";
// import type { MiddlewareOptions } from "../types.d.ts";
import type { MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";

export type HonoMiddlewareOptions = MiddlewareOptions<"hono">;

export interface HonoMiddlewareHooks {
  // handler: ((c: Context, next: Next) => Promise<void>);
  handler: MiddlewareHandler;
  onRequest: (c: Context) => Promise<void>;
  onResponse: (c: Context) => Promise<void>;
  onError: (error: unknown, c: Context) => Promise<void>;
}

export type HonoMiddlewareFn = <A extends RpcPluginOptions["adapter"] = "hono">(
  initialOptions: Partial<MiddlewareOptions<A>>,
) => HonoMiddlewareHooks["handler"];
