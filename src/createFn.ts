// /vite-uni-rpc/src/createFn.ts

import { serverCache } from "./cache";
import type { JsonArray, ServerFnEntry, ServerFunctionOptions } from "./types";
import { serverFunctionsMap } from "./utils";
import { defaultServerFnOptions } from "./options";

export function createServerFunction<
  TResult = unknown,
>(
  name: string,
  fn: ServerFnEntry<TResult>,
  initialOptions: Partial<ServerFunctionOptions> = {},
) {
  const options = { ...defaultServerFnOptions, ...initialOptions };
  const wrappedFunction = async (...args: JsonArray[]) => {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
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
  serverFunctionsMap.set(name, {
    name,
    fn: wrappedFunction as ServerFnEntry,
    options,
  });

  return wrappedFunction;
}
