// vite-mini-rpc/src/utils.ts
import type { IncomingMessage } from "node:http";

export const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: string) => body += chunk);
    req.on("end", () => resolve(body));
  });
};
