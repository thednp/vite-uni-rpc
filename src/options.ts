import type { CorsOptions } from "cors";
import type {
  CSRFMiddlewareOptions,
  MiddlewareOptions,
  RpcPluginOptions,
  ServerFunctionOptions,
} from "./types";

export const defaultCorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"],
} satisfies CorsOptions;

export const defaultCSRFOptions = {
  expires: 24, // 24h
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
} satisfies CSRFMiddlewareOptions;

export const defaultServerFnOptions = {
  ttl: 10 * 1000, // 10s
  invalidateKeys: [],
} satisfies ServerFunctionOptions;

export const defaultRPCOptions = {
  cors: defaultCorsOptions,
  csrf: defaultCSRFOptions,
  rpcPreffix: "__rpc",
  headers: undefined,
  rateLimit: {
    windowMs: 5 * 60 * 1000, //5m
    max: 100,
  },
  onError: undefined,
  onRequest: undefined,
  onResponse: undefined,
} satisfies RpcPluginOptions;

export const defaultMiddlewareOptions = {
  rpcPreffix: defaultRPCOptions.rpcPreffix,
  path: undefined,
  headers: {} as Record<string, string>,
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1000, // 5m
  },
  handler: undefined,
  onError: undefined,
  onRequest: undefined,
  onResponse: undefined,
} satisfies MiddlewareOptions;
