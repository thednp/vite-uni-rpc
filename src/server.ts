// /vite-mini-rpc/src/server.ts

import { serverCache } from "./cache";
import type { ServerFnEntry, ServerFunctionOptions } from "./types";
import { serverFunctionsMap } from "./serverFunctionsMap";

export function registerServerFunction(
  name: string,
  fn: ServerFnEntry,
  options: ServerFunctionOptions = {},
) {
  serverFunctionsMap.set(name, { name, fn, options });
}

export function createServerFunction(
  name: string,
  fn: ServerFnEntry,
  options: ServerFunctionOptions = {},
) {
  const wrappedFunction = async (...args: unknown[]) => {
    if (!options.cache?.ttl) return fn(...args);

    const cacheKey = `${name}-${JSON.stringify(args)}`;
    const result = await serverCache.get(
      cacheKey,
      options.cache.ttl,
      async () => await fn(...args),
    );

    if (options.cache.invalidateKeys) {
      serverCache.invalidate(options.cache.invalidateKeys);
    }

    return result;
  };

  registerServerFunction(name, wrappedFunction, options);
  return wrappedFunction;
}
