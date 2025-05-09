import type { CorsOptions } from "cors";
import type {
  CSRFMiddlewareOptions,
  MiddlewareOptions,
  RpcPluginOptions,
  ServerFunctionOptions,
} from "./types";

export const defaultCorsOptions: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"],
};

export const defaultCSRFOptions: CSRFMiddlewareOptions = {
  expires: 24, // 24h
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
};

export const defaultServerFnOptions: ServerFunctionOptions = {
  ttl: 10 * 1000, // 10s
  invalidateKeys: [],
};

export const defaultRPCOptions: RpcPluginOptions = {
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
};

export const defaultMiddlewareOptions: MiddlewareOptions = {
  rpcPreffix: defaultRPCOptions.rpcPreffix,
  path: undefined,
  headers: {},
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1000, // 5m
  },
  handler: undefined,
  onError: undefined,
  onRequest: undefined,
  onResponse: undefined,
};
