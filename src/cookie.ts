import { parse as parseCookies } from "node:querystring";
// import type { IncomingMessage, ServerResponse } from "node:http";
// import type { Request, Response } from "express";
import type { AnyRequest, AnyResponse, TokenOptions } from "./types";
// import { isExpressRequest, isExpressResponse } from "./utils";
import { getRequestDetails, getResponseDetails } from "./utils";

// Helper to parse cookies from request header
export function getCookies(req: AnyRequest) {
  const { headers } = getRequestDetails(req);
  // const cookieHeader = !isExpressRequest(req)
  //   ? req.headers.cookie
  //   : req.get?.("cookie");
  const cookieHeader = headers["cookie"];
  if (!cookieHeader) return {};
  return parseCookies(cookieHeader.replace(/; /g, "&"));
}

const defaultsTokenOptions: TokenOptions = {
  expires: "",
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/",
};

// Helper to set secure cookie
export function setSecureCookie(
  res: AnyResponse,
  name: string,
  value: string,
  options: Partial<TokenOptions> = {},
) {
  const cookieOptions = { ...defaultsTokenOptions, ...options };
  const { setHeader } = getResponseDetails(res);
  const cookieString = Object.entries(cookieOptions)
    .reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);

  // if (isExpressResponse(res)) {
  //   res.set("Set-Cookie", cookieString);
  // } else {
  //   res.setHeader("Set-Cookie", cookieString);
  // }
  setHeader("Set-Cookie", cookieString);
}
