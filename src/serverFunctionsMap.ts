import { ServerFunction, ServerFunctionOptions } from "./types";

export const serverFunctionsMap = new Map<string, { name: string, fn: ServerFunction<unknown[], unknown>, options?: ServerFunctionOptions }>()
