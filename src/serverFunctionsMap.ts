// /vite-plugin-trpc/src/serverFunctionsMap.ts
// import { ServerFunction, ServerFnEntry, ServerFunctionOptions } from "./types";
import { ServerFunction } from "./types";

// export const serverFunctionsMap = new Map<string, { name: string, fn: ServerFnEntry<unknown[], unknown>, options?: ServerFunctionOptions }>()
export const serverFunctionsMap = new Map<string, ServerFunction>();
