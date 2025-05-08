// /vite-mini-rpc/src/createFn.ts

import { serverCache } from "./cache";
import type { Arguments, ServerFnEntry, ServerFunctionOptions } from "./types";
import { serverFunctionsMap } from "./registry";
import { defaultOptions } from "./options";

export function createServerFunction<
  TArgs extends Arguments[] = Arguments[],
  TResult = unknown,
>(
  name: string,
  fn: ServerFnEntry<TArgs, TResult>,
  initialOptions: ServerFunctionOptions = {},
): ServerFnEntry<TArgs, TResult> {
  const options = { ttl: defaultOptions.ttl, ...initialOptions };
  const wrappedFunction = async (...args: TArgs) => {
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
    fn: wrappedFunction as ServerFnEntry<Arguments[], unknown>,
    options,
  });

  return wrappedFunction;
}
