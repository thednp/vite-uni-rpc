// src/hono/createCSRF.ts
import { csrf } from "hono/csrf";
import { mergeConfig } from "vite";

export const defaultCSRFOptions = {
  origin: undefined,
} satisfies HonoCSRFOptions;

export type HonoCSRFOptions = Parameters<typeof csrf>[0];

/**
 * Create a Cross Site Request Forgery (CSRF) middleware
 * @param initialOptions
 * @returns a new CSRF middleware
 */
export const createCSRF = (
  initialOptions: Partial<HonoCSRFOptions> = {},
) => {
  const options = mergeConfig(
    defaultCSRFOptions,
    initialOptions,
  ) as HonoCSRFOptions;
  return csrf(options);
};
