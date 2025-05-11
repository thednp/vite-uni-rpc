import {
  getRequestDetails,
  getResponseDetails
} from "./chunk-JKZP7UJS.js";

// src/cookie.ts
import { parse as parseCookies } from "node:querystring";
function getCookies(req) {
  const { headers } = getRequestDetails(req);
  const cookieHeader = headers.cookie;
  if (!cookieHeader) return {};
  return parseCookies(cookieHeader.replace(/; /g, "&"));
}
function getCookie(req, name) {
  return getCookies(req)[name];
}
var defaultTokenOptions = {
  expires: "",
  HttpOnly: true,
  Secure: true,
  SameSite: "Strict",
  Path: "/"
};
function setSecureCookie(res, name, value, options = {}) {
  const cookieOptions = { ...defaultTokenOptions, ...options };
  const { setHeader } = getResponseDetails(res);
  const cookieString = Object.entries(cookieOptions).reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);
  setHeader("Set-Cookie", cookieString);
}

export {
  getCookies,
  getCookie,
  setSecureCookie
};
