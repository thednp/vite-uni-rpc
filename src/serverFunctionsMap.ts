// /vite-mini-rpc/src/serverFunctionsMap.ts
import { Arguments, ServerFunction } from "./types";

export const serverFunctionsMap = new Map<
  string,
  ServerFunction<Arguments[], unknown>
>();
