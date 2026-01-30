import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import { MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";
import "vite";
import "express";
import "hono";

//#region src/fastify/types.d.ts
type FastifyMiddlewareOptions = MiddlewareOptions<"fastify">;
type FastifyMiddlewareFn = <A extends RpcPluginOptions["adapter"] = "fastify">(initialOptions?: Partial<MiddlewareOptions<A>>) => FastifyMiddlewareHooks["handler"];
interface FastifyMiddlewareHooks {
  handler: (req: FastifyRequest, res: FastifyReply, done: HookHandlerDoneFunction) => Promise<void>;
  onError: (error: unknown, req: FastifyRequest, res: FastifyReply) => Promise<void>;
  onRequest: (req: FastifyRequest) => Promise<void>;
  onResponse: (res: FastifyReply) => Promise<void>;
}
// Define the plugin function
type RpcFastifyPluginOptions = MiddlewareOptions<"fastify"> & {
  isRPC: boolean;
};
//#endregion
//#region src/fastify/createMiddleware.d.ts
declare const createMiddleware: FastifyMiddlewareFn;
declare const createRPCMiddleware: FastifyMiddlewareFn;
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
//#region src/fastify/helpers.d.ts
declare const readBody: (req: FastifyRequest) => Promise<BodyResult>;
//#endregion
export { FastifyMiddlewareFn, FastifyMiddlewareHooks, FastifyMiddlewareOptions, RpcFastifyPluginOptions, createMiddleware, createRPCMiddleware, readBody };
//# sourceMappingURL=fastify.d.mts.map