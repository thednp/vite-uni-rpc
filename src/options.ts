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
  rpcPreffix: undefined,
  expires: 24, // 24h
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
} satisfies CSRFMiddlewareOptions;

export const defaultServerFnOptions = {
  // contentType: "application/json",
  ttl: 10 * 1000, // 10s
  invalidateKeys: [],
} satisfies ServerFunctionOptions;

export const defaultRPCOptions = {
  rpcPreffix: "__rpc",
  adapter: "express",
  cors: {},
  csrf: {},
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
  // rpcPreffix: defaultRPCOptions.rpcPreffix,
  rpcPreffix: undefined,
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
