// vite-uni-rpc/src/fastify/helpers.ts
import { FastifyRequest } from "fastify";
import { Buffer } from "node:buffer";
import formidable from "formidable";
import { BodyResult } from "../types";

export const readBody = (req: FastifyRequest): Promise<BodyResult> => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"]?.toLowerCase() || "";

    if (contentType.includes("multipart/form-data")) {
      const form = formidable({ multiples: true });
      form.parse(req.raw, (err, fields, files) => {
        if (err) return reject(err);
        resolve({
          contentType: "multipart/form-data",
          fields,
          files,
        });
      });
      return;
    }

    let body = "";
    const chunks: Buffer[] = [];

    req.raw.on("data", (chunk) => {
      if (contentType.includes("octet-stream")) {
        chunks.push(chunk);
      } else {
        body += chunk.toString();
      }
    });

    req.raw.on("end", () => {
      if (contentType.includes("octet-stream")) {
        resolve({
          contentType: "application/octet-stream",
          data: Buffer.concat(chunks),
        });
        return;
      }

      if (contentType.includes("json")) {
        try {
          resolve({
            contentType: "application/json",
            data: JSON.parse(body),
          });
        } catch (_e) {
          reject(new Error("Invalid JSON"));
        }
        return;
      }

      if (contentType.includes("urlencoded")) {
        resolve({
          contentType: "application/x-www-form-urlencoded",
          data: Object.fromEntries(new URLSearchParams(body)),
        });
        return;
      }

      resolve({ contentType: "text/plain", data: body });
    });

    req.raw.on("error", reject);
  });
};
