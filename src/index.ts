// packages/vite-plugin-trpc/src/plugin.ts
import type { Plugin } from 'vite'
import { createHash } from 'node:crypto'
import { readBody } from './utils'
import { serverFunctionsMap } from './serverFunctionsMap'

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toAbsolute = (p:string) => resolve(__dirname, p);

export default function trpcPlugin(): Plugin {
  // const serverFiles = new Set<string>()

  const VIRTUAL_MODULE_PREFIX = 'virtual:@rpc/';
  const RESOLVED_VIRTUAL_MODULE_PREFIX = '\0' + VIRTUAL_MODULE_PREFIX;
  const REGISTRY_MODULE_ID = 'virtual:@rpc-registry';
  const RESOLVED_REGISTRY_MODULE_ID = '\0' + REGISTRY_MODULE_ID;

  return {
    name: 'vite-plugin-rpc',
    enforce: 'pre',

    buildStart() {
      // registeredFunctions.clear();
      serverFunctionsMap.clear();
    },
    resolveId(source: string, importer, { ssr }) {
      // Handle registry module
      if (source === REGISTRY_MODULE_ID) {
        console.log('Resolving registry module:', source, ssr);
        // return RESOLVED_REGISTRY_MODULE_ID;
        return ssr ? toAbsolute('./serverFunctionsMap.ts') : RESOLVED_REGISTRY_MODULE_ID
      }
      // Handle RPC function modules
      if (source.startsWith(VIRTUAL_MODULE_PREFIX)) {
        console.log('Resolving RPC module:', source);
        // return RESOLVED_VIRTUAL_MODULE_PREFIX + source.slice(VIRTUAL_MODULE_PREFIX.length);
      }
      return null;
    },

    load(id: string, ops) {
      // Handle registry module
      if (id === RESOLVED_REGISTRY_MODULE_ID) {
        console.log('Loading registry with functions:', Array.from(serverFunctionsMap.keys()));
        // if (ops.ssr) {
        //   return toAbsolute('./serverFunctionsMap.ts');
        // }

        return `
          // Generated registry module
          const functions = ${JSON.stringify(Array.from(serverFunctionsMap.keys()))};
          console.log('Registry loaded with:', functions);
          export default functions;
        `;
      }

      // Handle RPC function modules
      if (id.startsWith(RESOLVED_VIRTUAL_MODULE_PREFIX)) {
        const fnName = id.slice(RESOLVED_VIRTUAL_MODULE_PREFIX.length);
        console.log('Loading RPC module:', fnName);
        return `
          console.log('RPC function loaded:', '${fnName}');
          export default async function ${fnName}(...args) {
            const response = await fetch('/__rpc/${fnName}', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(args)
            });
            if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            return result.data;
          }
        `;
      }
      return null;
    },

transform(code: string, id: string, { ssr }) {
      if (!code.includes('createServerFunction')) {
        return null;
      }

      console.log('Transform:', { id, ssr, functions: Array.from(serverFunctionsMap.keys()) });

      if (ssr) {
        // Let the original code execute in SSR mode
        return null;
      }

      // Only transform non-node_modules files that use server functions
      if (!id.includes('node_modules')) {
        console.log('Transforming client code');
        
        // Import the functions list from the registry
        const transformedCode = `
          import registeredFunctions from '${REGISTRY_MODULE_ID}';
          ${Array.from(serverFunctionsMap.keys())
            .map(name => `
              import ${name}Impl from '${VIRTUAL_MODULE_PREFIX}${name}';
              export const ${name} = ${name}Impl;
            `)
            .join('\n')}
        `;

        console.log('Generated:', transformedCode);
        return {
          code: transformedCode,
          map: null
        };
      }

      return null;
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
