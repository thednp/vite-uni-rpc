import { parse as parseCookies } from "node:querystring";
import type { ServerResponse } from "node:http";
import type { CSRFTokenOptions } from "./types"

// Helper to parse cookies from request header
export function getCookies(cookieHeader: string | undefined) {
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
  res: ServerResponse,
  name: string,
  value: string,
  options: Partial<CSRFTokenOptions> = {},
) {


  const cookieOptions = { ...defaultsTokenOptions, ...options };
  const cookieString = Object.entries(cookieOptions)
    .reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);

  res.setHeader("Set-Cookie", cookieString);
}
