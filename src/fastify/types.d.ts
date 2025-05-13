import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import { type MiddlewareOptions } from "../types";

export type FastifyMiddlewareFn = <
  A extends RpcPluginOptions["adapter"] = "fastify",
>(
  initialOptions?: Partial<MiddlewareOptions<A>>,
) => (
  req: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) => Promise<void>;

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
  onRequest: (
    req: FastifyRequest,
  ) => Promise<void>;
  onResponse: (
    res: FastifyReply,
  ) => Promise<void>;
}

// Define the plugin function
export type RpcFastifyPluginOptions = MiddlewareOptions<"fastify"> & {
  isRPC: boolean;
};
