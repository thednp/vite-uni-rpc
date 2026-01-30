import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import type { MiddlewareOptions, RpcPluginOptions } from "vite-uni-rpc";

export type FastifyMiddlewareOptions = MiddlewareOptions<"fastify">;

export type FastifyMiddlewareFn = <
  A extends RpcPluginOptions["adapter"] = "fastify",
>(
  initialOptions?: Partial<MiddlewareOptions<A>>,
) => FastifyMiddlewareHooks["handler"];

export interface FastifyMiddlewareHooks {
  handler: (
    req: FastifyRequest,
    res: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => Promise<void>;
  onError: (
    error: unknown,
    req: FastifyRequest,
    res: FastifyReply,
  ) => Promise<void>;
  onRequest: (req: FastifyRequest) => Promise<void>;
  onResponse: (res: FastifyReply) => Promise<void>;
}

// Define the plugin function
export type RpcFastifyPluginOptions = MiddlewareOptions<"fastify"> & {
  isRPC: boolean;
};
