// packages/vite-plugin-trpc/src/plugin.ts
import type { Plugin } from 'vite'
// import MagicString from 'magic-string'
import { createHash } from 'node:crypto'
import { readBody } from './utils'
import { serverFunctionsMap } from './server'

export default function trpcPlugin(): Plugin {
  // const serverFiles = new Set<string>()

  const VIRTUAL_MODULE_PREFIX = 'virtual:@rpc/';
  const RESOLVED_VIRTUAL_MODULE_PREFIX = '\0' + VIRTUAL_MODULE_PREFIX;

  return {
    name: 'vite-plugin-rpc',
    enforce: 'pre',

    resolveId(source: string) {
      if (source.startsWith(VIRTUAL_MODULE_PREFIX)) {
        // Important: return the resolved virtual module ID
        return RESOLVED_VIRTUAL_MODULE_PREFIX + source.slice(VIRTUAL_MODULE_PREFIX.length)
      }
      return null
    },

    load(id: string) {
      if (id.startsWith(RESOLVED_VIRTUAL_MODULE_PREFIX)) {
        const fnName = id.slice(RESOLVED_VIRTUAL_MODULE_PREFIX.length)
        return `
          export default async function ${fnName}(...args) {
            const response = await fetch('/__rpc/${fnName}', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
              },
              body: JSON.stringify(args)
            });
            if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            return result.data;
          }
        `
      }
      return null
    },

    transform(code: string, id: string, { ssr }: { ssr: boolean }) {
      // Only transform files with server functions
      if (!code.includes('createServerFunction')) {
        return null
      }

      if (ssr) {
        // In SSR mode, let Vite handle it
        return null
      }

      // Client-side: Replace all server functions with virtual module imports
      const matches = Array.from(code.matchAll(/export\s+(?:const|let|var)\s+(\w+)\s*=\s*createServerFunction\s*\(\s*['"]([^'"]+)['"]/g))
      
      if (matches.length === 0) return null

      let transformedCode = code
      for (const [fullMatch, varName, fnName] of matches) {
        const importStatement = `
import ${varName}Impl from '${VIRTUAL_MODULE_PREFIX}${fnName}';
export const ${varName} = ${varName}Impl;`
        
        transformedCode = transformedCode.replace(fullMatch, importStatement)
      }

      return {
        code: transformedCode,
        map: null
      }
    },

    // transform(code, id) {
    //   // Skip node_modules
    //   if (id.includes('node_modules')) return

    //   // Check for 'use server' directive at file level
    //   const isServerFile = code.trim().startsWith("'use server'") || 
    //                       code.trim().startsWith('"use server"')

    //   if (isServerFile) {
    //     serverFiles.add(id)
    //     // If client build, replace with proxy imports
    //     if (!isSSR) {
    //       return {
    //         code: generateClientProxy(id),
    //         map: null
    //       }
    //     }
    //     return
    //   }

    //   // Handle individual server functions
    //   if (code.includes('use server')) {
    //     if (!isSSR) {
    //       const s = new MagicString(code)
    //       // Transform server functions to client proxies
    //       return {
    //         code: transformServerFunctions(code, s),
    //         map: s.generateMap({ hires: true })
    //       }
    //     }
    //   }
    // },

    configureServer(server) {
      // Set CSRF token
      server.middlewares.use((req, res, next) => {
        if (req.method === 'GET') {
          const csrfToken = createHash('sha256').update(Date.now().toString()).digest('hex')
          res.setHeader('X-CSRF-Token', csrfToken)
        }
        next()
      })

      // Handle RPC calls
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__rpc/')) return next()

        // Validate CSRF token
        const csrfToken = req.headers['x-csrf-token']
        if (!csrfToken) {
          res.statusCode = 403
          res.end(JSON.stringify({ error: 'Invalid CSRF token' }))
          return
        }

        const functionName = req.url.replace('/__rpc/', '')
        const serverFunction = serverFunctionsMap.get(functionName)

        if (!serverFunction) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Function not found' }))
          return
        }

        try {
          const body = await readBody(req)
          const args = JSON.parse(body || '[]')

          const result = await serverFunction.fn(...args)
          res.end(JSON.stringify({ data: result }))
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(error) }))
        }
      })
    }
  }
}
