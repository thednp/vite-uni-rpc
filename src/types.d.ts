// vite-mini-rpc/src/types.d.ts
export interface ServerFunctionOptions {
  cache?: {
    ttl?: number;
    invalidateKeys?: string | RegExp | RegExp[] | string[];
  };
}

type PrimitiveType = boolean | string | number;
type ObjectType = Record<string | number, PrimitiveType | PrimitiveType[]>;
type Arguments =
  | PrimitiveType[]
  | Array<PrimitiveType | PrimitiveType[] | ObjectType | ObjectType[]>
  | unknown;

export type ServerFnEntry<
  TArgs extends Arguments[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult> | TResult;

export interface ServerFunction<
  TArgs extends Arguments[] = unknown[],
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
