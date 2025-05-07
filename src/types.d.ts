// vite-mini-rpc/src/types.d.ts
export interface ServerFunctionOptions {
  cache?: {
    ttl?: number;
    invalidateKeys?: string | RegExp | RegExp[] | string[];
  };
}

type Primitive = boolean | string | number;

export type ServerFnEntry<
  TArgs extends Primitive[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult> | TResult;

export interface ServerFunction<
  TArgs extends Primitive[] = unknown[],
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
