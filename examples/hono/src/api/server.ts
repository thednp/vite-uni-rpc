import { createServerFunction } from "vite-uni-rpc/server";

export const sayHi = createServerFunction(
  "say-hi",
  async (name: string) => {
    await new Promise(res => setTimeout(res, 1500));
    return `Hello ${name}!`;
  },
  { ttl: 5000 }
);
