// packages/vite-plugin-trpc/src/plugin.ts
import type { Plugin } from 'vite'
// import MagicString from 'magic-string'
import { createHash } from 'node:crypto'
import { readBody, generateClientProxy, transformServerFunctions } from './utils'
import { serverFunctionsMap } from './server'

export default function trpcPlugin(): Plugin {
  let isSSR = false
  // const serverFiles = new Set<string>()

  const VIRTUAL_MODULE_PREFIX = 'virtual:@rpc/';
  const RESOLVED_VIRTUAL_MODULE_PREFIX = '\0' + VIRTUAL_MODULE_PREFIX;

  return {
    name: 'vite-plugin-rpc',
    
    config(config) {
      isSSR = !!config.build?.ssr
    },
    resolveId(id: string) {
      if (id.startsWith(VIRTUAL_MODULE_PREFIX)) {
        return '\0' + id
      }
      return null
    },

    load(id: string) {
      if (id.startsWith(RESOLVED_VIRTUAL_MODULE_PREFIX)) {
        const fnName = id.slice(RESOLVED_VIRTUAL_MODULE_PREFIX.length)
        // Return client-side proxy for the function
        return `
          export default async function ${fnName}(...args) {
            const response = await fetch('/__rpc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: '${fnName}', args })
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
        // Server-side: Register the function and keep original implementation
        const functionMatches = code.matchAll(/createServerFunction\(['"]([\w-]+)['"],\s*async?\s*\((.*?)\)\s*=>\s*{/g)
        for (const match of functionMatches) {
          const [_, fnName] = match
          serverFunctionsMap.set(fnName, code)
        }
        return {
          code,
          map: null
        }
      } else {
        // Client-side: Replace with imports to virtual modules
        return {
          code: code.replace(
            /export const (\w+)\s*=\s*createServerFunction\(['"]([^'"]+)['"]/g,
            (_, varName, fnName) => `
              import ${varName}Impl from '${VIRTUAL_MODULE_PREFIX}${fnName}';
              export const ${varName} = ${varName}Impl;
            `
          ),
          map: null
        }
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
