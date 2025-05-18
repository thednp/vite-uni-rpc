// vite-uni-rpc/src/fastify/helpers.ts
import type { FastifyRequest } from "fastify";
import type { BodyResult, JsonValue } from "../types";

export const readBody = (req: FastifyRequest): Promise<BodyResult> => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"]?.toLowerCase() || "";

    if (contentType.includes("json")) {
      resolve({
        contentType: "application/json",
        data: req.body as JsonValue,
      });
      return;
    }

    let body = "";
    req.raw.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.raw.on("end", () => {
      resolve({ contentType: "text/plain", data: body });
    });

    req.raw.on("error", reject);
  });
};
