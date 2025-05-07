// vite-mini-rpc/src/types.d.ts
interface ServerFunctionOptions {
  cache?: {
    ttl?: number;
    invalidateKeys?: string | RegExp | RegExp[] | string[];
  };
}

type ServerFnEntry<
  TArgs extends unknown[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult>;

declare function registerServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): void;
declare function createServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): (...args: unknown[]) => Promise<unknown>;

export { createServerFunction, registerServerFunction };
