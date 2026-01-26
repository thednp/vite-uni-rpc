// /vite-uni-rpc/src/createFn.ts

import { serverCache } from "./cache.ts";
import type {
  ServerFnArgs,
  ServerFnEntry,
  ServerFunctionOptions,
} from "./types.d.ts";
import { serverFunctionsMap } from "./utils.ts";
import { defaultServerFnOptions } from "./options.ts";

export function createServerFunction<
  TResult = unknown,
>(
  name: string,
  fn: ServerFnEntry<ServerFnArgs, TResult>,
  initialOptions: Partial<ServerFunctionOptions> = {},
) {
  const options = { ...defaultServerFnOptions, ...initialOptions };
  const wrappedFunction = async (...args: ServerFnArgs) => {
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
