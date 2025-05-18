// src/hono/helpers.ts
import { type ViteDevServer } from "vite";
import { type HttpBindings } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
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

  if (contentType.includes("json")) {
    const data = await c.req.json();
    return {
      contentType: "application/json",
      data,
    };
  }

  const text = await c.req.text();
  return { contentType: "text/plain", data: text };
};
