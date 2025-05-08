import { A as Arguments, S as ServerFnEntry, a as ServerFunctionOptions } from './types.d-BKHNpU35.js';

declare function createServerFunction<TArgs extends Arguments[] = Arguments[], TResult = unknown>(name: string, fn: ServerFnEntry<TArgs, TResult>, initialOptions?: ServerFunctionOptions): ServerFnEntry<TArgs, TResult>;

export { createServerFunction };
