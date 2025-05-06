// packages/vite-plugin-trpc/src/plugin.ts
import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { createHash } from 'node:crypto'
import { readBody, generateClientProxy, transformServerFunctions } from './utils'
import { serverFunctionsMap } from './server'

export function trpcPlugin(): Plugin {
  let isSSR = false
  const serverFiles = new Set<string>()

  return {
    name: 'vite-plugin-rpc',
    
    config(config) {
      isSSR = !!config.build?.ssr
    },

    transform(code, id) {
      // Skip node_modules
      if (id.includes('node_modules')) return

      // Check for 'use server' directive at file level
      const isServerFile = code.trim().startsWith("'use server'") || 
                          code.trim().startsWith('"use server"')

      if (isServerFile) {
        serverFiles.add(id)
        // If client build, replace with proxy imports
        if (!isSSR) {
          return {
            code: generateClientProxy(id),
            map: null
          }
        }
        return
      }

      // Handle individual server functions
      if (code.includes('use server')) {
        if (!isSSR) {
          const s = new MagicString(code)
          // Transform server functions to client proxies
          return {
            code: transformServerFunctions(code, s),
            map: s.generateMap({ hires: true })
          }
        }
      }
    },

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
