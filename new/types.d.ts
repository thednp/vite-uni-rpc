export interface ServerFunctionOptions {
  cache?: {
    ttl?: number
    invalidateKeys?: string | RegExp | RegExp[] | string[]
  }
}

export interface ServerFunction <TArgs extends unknown[], TResult>{
  name: string
  fn: (...args: TArgs) => Promise<TResult>
  options?: ServerFunctionOptions
}

export type CacheEntry<T> = {
  data: T
  timestamp: number
  promise?: Promise<T>
}

// serverFunctionsMap.set(name, { name, fn, options })

export type ServerFunctionEntry = {
  name: string;
  // fn: ServerFunction<u>
}