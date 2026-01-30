import * as hono0 from "hono";
import { Context, MiddlewareHandler } from "hono";
import { MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";
import { ViteDevServer } from "vite";
import { HttpBindings } from "@hono/node-server";
import "express";
import "fastify";

//#region src/hono/types.d.ts
type HonoMiddlewareOptions = MiddlewareOptions<"hono">;
interface HonoMiddlewareHooks {
  // handler: ((c: Context, next: Next) => Promise<void>);
  handler: MiddlewareHandler;
  onRequest: (c: Context) => Promise<void>;
  onResponse: (c: Context) => Promise<void>;
  onError: (error: unknown, c: Context) => Promise<void>;
}
type HonoMiddlewareFn = <A extends RpcPluginOptions["adapter"] = "hono">(initialOptions: Partial<MiddlewareOptions<A>>) => HonoMiddlewareHooks["handler"];
//#endregion
//#region src/hono/createMiddleware.d.ts
declare const createMiddleware: HonoMiddlewareFn;
declare const createRPCMiddleware: HonoMiddlewareFn;
//#endregion
//#region src/types.d.ts
type BodyResult = {
  contentType: "application/json";
  data: JsonValue;
} | {
  contentType: "text/plain";
  data: string;
};
// primitives and their compositions
type JsonPrimitive = string | number | boolean | null | undefined;
type JsonObject = {
  [key: string]: JsonValue | JsonArray;
};
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
//#endregion
//#region src/hono/helpers.d.ts
/**
 * Creates a hono compatible middleware for a given vite development server.
 * @see https://github.com/honojs/hono/issues/3162#issuecomment-2331118049
 * @param vite the vite development server
 */
declare const viteMiddleware: (vite: ViteDevServer) => hono0.MiddlewareHandler<{
  Bindings: HttpBindings;
}, string, {}, Response>;
declare const readBody: (c: Context) => Promise<BodyResult>;
//#endregion
export { HonoMiddlewareFn, HonoMiddlewareHooks, HonoMiddlewareOptions, createMiddleware, createRPCMiddleware, readBody, viteMiddleware };
//# sourceMappingURL=hono.d.mts.map