// vite-mini-rpc/src/types.d.ts
interface ServerFunctionOptions {
  cache?: {
    ttl?: number;
    invalidateKeys?: string | RegExp | RegExp[] | string[];
  };
}

type Primitive = boolean | string | number;

type ServerFnEntry<
  TArgs extends Primitive[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult> | TResult;

declare function registerServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): void;
declare function createServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): void;

export { createServerFunction, registerServerFunction };
