// packages/vite-plugin-trpc/src/server/index.ts
// 'use server'

import { serverCache } from './cache'
import type { ServerFunction, ServerFunctionOptions } from './types'
// import { serverFunctionsMap } from "./serverFunctionsMap";
import { serverFunctionsMap } from "virtual:@rpc-registry";

export function registerServerFunction(
  name: string,
  fn: ServerFunction<unknown[], unknown>,
  options?: ServerFunctionOptions
) {
  serverFunctionsMap.set(name, { name, fn, options })
}

export function createServerFunction<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: ServerFunctionOptions = {}
) {
  const wrappedFunction: ServerFunction<TArgs, TResult>["fn"] = async (...args: TArgs) => {
    if (!options.cache?.ttl) return fn(...args)

    const cacheKey = `${name}-${JSON.stringify(args)}`
    const result = await serverCache.get(
      cacheKey,
      options.cache.ttl,
      () => fn(...args)
    )

    if (options.cache.invalidateKeys) {
      serverCache.invalidate(options.cache.invalidateKeys)
    }

    return result
  }

  registerServerFunction(name, wrappedFunction, options)
  return wrappedFunction;
}
