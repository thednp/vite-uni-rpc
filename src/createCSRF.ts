// src/createCSRF.ts
import { type IncomingMessage, type ServerResponse } from "node:http";
import { type Connect } from "vite";
import { createHash } from "node:crypto";
import { getCookies, setSecureCookie } from "./cookie";
import type { CSRFMiddlewareOptions } from "./types"

const defaultCSRFOptions: CSRFMiddlewareOptions = {
  expires: 24,
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
}

/**
 * Create a Cross Site Request Forgery (CSRF) middleware
 * @param initialOptions 
 * @returns a new CSRF middleware
 */
export const createCSRF = (initialOptions: Partial<CSRFMiddlewareOptions> = {}) => {
  const options = { ...defaultCSRFOptions, ...initialOptions };

  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const cookies = getCookies(req.headers.cookie);
    if (!cookies["X-CSRF-Token"]) {
      const csrfToken = createHash("sha256").update(Date.now().toString())
        .digest("hex");
      setSecureCookie(res, "X-CSRF-Token", csrfToken, {
        ...options,
        expires: new Date(Date.now() + (options.expires) * 60 * 60 * 1000).toUTCString(),
      });
    }
    next();
  }
}
