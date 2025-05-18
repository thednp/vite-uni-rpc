// src/hono/helpers.ts
import { type ViteDevServer } from "vite";
import { type HttpBindings } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import formidable from "formidable";
import type { BodyResult } from "../types";

/**
 * Creates a hono compatible middleware for a given vite development server.
 * @see https://github.com/honojs/hono/issues/3162#issuecomment-2331118049
 * @param vite the vite development server
 */
export const viteMiddleware = (vite: ViteDevServer) => {
  return createMiddleware<{ Bindings: HttpBindings }>((c, next) => {
    return new Promise((resolve) => {
      // Node.js
      // @ts-expect-error - NodeJS is different
      if (typeof Bun === "undefined") {
        vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve(next()));
        return;
      }

      // Bun
      let sent = false;
      const headers = new Headers();
      // Polyfill the node:http IncommingMessage and ServerResponse
      vite.middlewares(
        {
          url: new URL(c.req.path, "http://localhost").pathname,
          method: c.req.raw.method,
          headers: Object.fromEntries(
            c.req.raw.headers,
          ),
        } as IncomingMessage,
        {
          setHeader(name, value: string) {
            headers.set(name, value);
            return this;
          },
          end(body) {
            sent = true;
            resolve(
              // @ts-expect-error - weird
              c.body(body, c.res.status as ContentfulStatusCode, headers),
            );
          },
        } as ServerResponse,
        () => sent || resolve(next()),
      );
    });
  });
};

export const readBody = async (c: Context): Promise<BodyResult> => {
  const contentType = c.req.header("content-type")?.toLowerCase() || "";

  if (contentType.includes("multipart/form-data")) {
    const form = formidable({ multiples: true });
    return new Promise((resolve, reject) => {
      form.parse(c.env.incoming, (err, fields, files) => {
        if (err) return reject(err);
        resolve({
          contentType: "multipart/form-data",
          fields,
          files,
        });
      });
    });
  }

  // For other content types, we can use the native Request methods
  if (contentType.includes("octet-stream")) {
    const buffer = await c.req.arrayBuffer();
    return {
      contentType: "application/octet-stream",
      data: Buffer.from(buffer),
    };
  }

  if (contentType.includes("json")) {
    const data = await c.req.json();
    return {
      contentType: "application/json",
      data,
    };
  }

  if (contentType.includes("urlencoded")) {
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData);
    return {
      contentType: "application/x-www-form-urlencoded",
      data,
    };
  }

  const text = await c.req.text();
  return { contentType: "text/plain", data: text };
};
