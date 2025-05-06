// packages/vite-plugin-trpc/src/utils.ts
import type { IncomingMessage } from 'node:http'
import MagicString from 'magic-string'

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: string) => body += chunk)
    req.on('end', () => resolve(body))
  })
}

export function generateClientProxy(id: string): string {
  return `
    import { createServerProxy } from 'vite-plugin-trpc/client'
    
    export const __SERVER_FILE__ = true
    ${id} // This will be processed by the plugin later
  `
}

export function transformServerFunctions(code: string, ms: MagicString): string {
  // Transform 'use server' functions to client proxies
  // Implementation details here
  return ms.toString()
}