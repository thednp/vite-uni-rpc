// vite-mini-rpc/src/types.d.ts
export interface ServerFunctionOptions {
  cache?: {
    ttl?: number;
    invalidateKeys?: string | RegExp | RegExp[] | string[];
  };
}

export type ServerFnEntry<
  TArgs extends unknown[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult>;

export interface ServerFunction<
  TArgs extends unknown[] = unknown[],
  TResult = unknown,
> {
  name: string;
  fn: ServerFnEntry<TArgs, TResult>;
  options?: ServerFunctionOptions;
}

export interface CacheEntry<T> {
  data?: T;
  timestamp: number;
  promise?: Promise<T>;
}
