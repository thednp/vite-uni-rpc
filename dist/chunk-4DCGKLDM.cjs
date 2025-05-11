"use strict";Object.defineProperty(exports, "__esModule", {value: true});


var _chunkAJLVM5DQcjs = require('./chunk-AJLVM5DQ.cjs');

// src/cookie.ts
var _querystring = require('querystring');
function getCookies(req) {
  const { headers } = _chunkAJLVM5DQcjs.getRequestDetails.call(void 0, req);
  const cookieHeader = headers.cookie;
  if (!cookieHeader) return {};
  return _querystring.parse.call(void 0, cookieHeader.replace(/; /g, "&"));
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
  const { setHeader } = _chunkAJLVM5DQcjs.getResponseDetails.call(void 0, res);
  const cookieString = Object.entries(cookieOptions).reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`);
  setHeader("Set-Cookie", cookieString);
}





exports.getCookies = getCookies; exports.getCookie = getCookie; exports.setSecureCookie = setSecureCookie;
