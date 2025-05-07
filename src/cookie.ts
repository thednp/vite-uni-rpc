import { parse as parseCookies } from 'node:querystring'

// Helper to parse cookies from request header
export function getCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return {}
  return parseCookies(cookieHeader.replace(/; /g, '&'))
}

// Helper to set secure cookie
export function setSecureCookie(res: any, name: string, value: string, options: Record<string, string> = {}) {
  const defaults = {
    HttpOnly: 'true',
    Secure: 'true',
    SameSite: 'Strict',
    Path: '/'
  }

  const cookieOptions = { ...defaults, ...options }
  const cookieString = Object.entries(cookieOptions)
    .reduce((acc, [key, val]) => `${acc}; ${key}=${val}`, `${name}=${value}`)

  res.setHeader('Set-Cookie', cookieString)
}
