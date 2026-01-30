// /vite-uni-rpc/src/createFn.ts
import { serverCache } from "./cache.ts";
import type {
  JsonValue,
  JsonArray,
  ServerFnArgs,
  ServerFunction,
  ServerFunctionOptions,
  ClientFunction,
  ServerFunctionInit,
} from "./types.d.ts";
import { serverFunctionsMap } from "./functionsMap.ts";
import { defaultServerFnOptions } from "./options.ts";

export function createServerFunction<
  TArgs extends JsonArray = JsonArray,
  TResult extends JsonValue = JsonValue,
>(
  name: string,
  fn: ServerFunctionInit<TArgs, TResult>,
  fnOptions: Partial<ServerFunctionOptions> = {},
) {
  const options = Object.assign({}, defaultServerFnOptions, fnOptions);
  const wrappedFunction = async (
    _signal: AbortSignal,
    ...args: ServerFnArgs
  ) => {
    // if (signal.aborted) {
    //   throw new Error("Operation aborted");
    // }
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const result = await serverCache.get(cacheKey, options.ttl, async () =>
      (fn as unknown as ClientFunction<TArgs, TResult>)(...(args as TArgs)),
    );

    if (options.invalidateKeys) {
      serverCache.invalidate(options.invalidateKeys);
    }

    return result;
  };
  // registerServerFunction(name, wrappedFunction, options);
  serverFunctionsMap.set(name, {
    name,
    // plugin makes this shift no worry here
    fn: wrappedFunction as unknown as ServerFunction<never, never>,
    options,
  });

  // console.log(`✅ wrappedFn now has fnOptions:`, fnOptions); // ✅ DEBUG

  console.log(
    `✅ serverFunctionsMap now has:`,
    Array.from(serverFunctionsMap.entries()).map(([k, v]) => [k, v.options]),
  ); // ✅ DEBUG

  return wrappedFunction as unknown as ClientFunction<TArgs, TResult>;
}
