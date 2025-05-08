import { parse as parseCookies } from "node:querystring";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import type { CSRFTokenOptions } from "./types";
import { isExpressRequest, isExpressResponse } from "./utils";

// Helper to parse cookies from request header
export function getCookies(req: Request | IncomingMessage) {
  const cookieHeader = !isExpressRequest(req)
    ? req.headers.cookie
    : req.get?.("cookie");
  if (!cookieHeader) return {};
  return parseCookies(cookieHeader.replace(/; /g, "&"));
}

const defaultsTokenOptions: CSRFTokenOptions = {
  expires: "",
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
};

// Helper to set secure cookie
export function setSecureCookie(
  res: ServerResponse | Response,
  name: string,
  value: string,
  options: Partial<CSRFTokenOptions> = {},
) {
  const cookieOptions = { ...defaultsTokenOptions, ...options };
  const cookieString = Object.entries(cookieOptions)
    .reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);

  if (isExpressResponse(res)) {
    res.set("Set-Cookie", cookieString);
  } else {
    res.setHeader("Set-Cookie", cookieString);
  }
}
