// src/hono/createCors.ts
import { cors } from "hono/cors";
import { mergeConfig } from "vite";

export type HonoCorsOptions = Parameters<typeof cors>[0];

export const defaultCorsOptions = {
  origin: "*",
  credentials: true,
  allowMethods: ["GET", "POST"],
  allowHeaders: ["Set-Cookie", "Content-Type", "X-CSRF-Token"],
} satisfies HonoCorsOptions;

/**
 * Create a Cross-Origin Resource Sharing (CORS) middleware
 * compatible with Hono.
 * @param initialOptions
 * @returns a new cors middleware
 */
export const createCors = (initialOptions: Partial<HonoCorsOptions> = {}) => {
  const options = mergeConfig(
    defaultCorsOptions,
    initialOptions,
  ) as HonoCorsOptions;
  return cors(options);
};
