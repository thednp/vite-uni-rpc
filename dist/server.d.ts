// vite-mini-rpc/src/types.d.ts
interface ServerFunctionOptions {
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

type ServerFnEntry<
  TArgs extends Arguments[] = unknown[],
  TResult = unknown,
> = (...args: TArgs) => Promise<TResult> | TResult;

declare function registerServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): void;
declare function createServerFunction(name: string, fn: ServerFnEntry, options?: ServerFunctionOptions): (...args: unknown[]) => Promise<unknown>;

export { createServerFunction, registerServerFunction };
