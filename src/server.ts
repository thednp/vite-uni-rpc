// /vite-mini-rpc/src/server.ts

import { serverCache } from "./cache";
import type { ServerFnEntry, ServerFunctionOptions } from "./types";
import { serverFunctionsMap } from "./serverFunctionsMap";
import { defaultOptions } from "./options";

// export function registerServerFunction(
//   name: string,
//   fn: ServerFnEntry,
//   options: ServerFunctionOptions = {},
// ) {
//   serverFunctionsMap.set(name, { name, fn, options });
// }

export function createServerFunction(
  name: string,
  fn: ServerFnEntry,
  initialOptions: ServerFunctionOptions = {},
) {
  if (serverFunctionsMap.has(name)) return;
  const options = { ttl: defaultOptions.ttl, ...initialOptions };
  const wrappedFunction = async (...args: unknown[]) => {
    // if (!options?.ttl) return fn(...args);

    const cacheKey = `${name}-${JSON.stringify(args)}`;
    const result = await serverCache.get(
      cacheKey,
      options.ttl,
      async () => await fn(...args),
    );

    if (options.invalidateKeys) {
      serverCache.invalidate(options.invalidateKeys);
    }

    return result;
  };

  // registerServerFunction(name, wrappedFunction, options);
  serverFunctionsMap.set(name, { name, fn, options });

  return wrappedFunction;
}
