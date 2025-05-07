import type { Plugin, ResolvedConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readBody } from './utils'
import { serverFunctionsMap } from './serverFunctionsMap'
// import { fileURLToPath } from "node:url"
// import { dirname, resolve, join } from "node:path"
import { join } from "node:path"
import { readdir } from 'fs/promises'
// import { transformWithEsbuild } from 'vite'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)
// const toAbsolute = (path: string) => resolve(__dirname, path);


export default function trpcPlugin(): Plugin {  
  let config: ResolvedConfig
  let serverFiles = new Set<string>();
  const functionMappings = new Map<string, string>();

  async function scanForServerFiles(root: string) {
    const apiDir = join(root, 'src', 'api')
    console.log('Scanning for server files in:', apiDir)
    
    // Find all server.ts/js files in the api directory
    const files = (await readdir(apiDir, { withFileTypes: true })).filter(f => {

      return f.name.includes("server.ts") || f.name.includes("server.js");
    }).map(f =>  join(apiDir, f.name));

    
    console.log('Found server files:', files)
    
    // Load and execute each server file
    for (const file of files) {
      try {
        serverFiles.add(file)
        const fileUrl = `file://${file}`;
        // Import the module to get the exported functions
        const moduleExports = await import(fileUrl)
        
        // Examine each export
        for (const [exportName, exportValue] of Object.entries(moduleExports)) {
          // Check if this export is in the serverFunctionsMap
          for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
            if (serverFn.fn === exportValue) {
              // Found a match - store the mapping
              functionMappings.set(registeredName, exportName)
              console.log('Mapped function:', { exportName, registeredName })
            }
          }
        }

        console.log('Registered server file:', file, 'with functions:', 
          Array.from(functionMappings.values()));
      } catch (error) {
        console.error('Error loading server file:', file, error)
      }
    }
  }

  return {
    name: 'vite-plugin-rpc',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    buildStart() {
      serverFunctionsMap.clear()
    },

    // Add this to handle server file imports
    // handleHotUpdate({ file, server }) {
    //   if (serverFiles.has(file)) {
    //     console.log('Server file changed:', file)
    //     // Clear and reload server functions
    //     serverFunctionsMap.clear()
    //     // Force reloading the server file
    //     server.reloadModule(file)
    //     // Notify clients to reload
    //     server.ws.send({ type: 'full-reload' })
    //   }
    // },

    async transform(code: string, id: string, ops?: { ssr?: boolean }) {
      // Only transform files with server functions for client builds
      if (!code.includes('createServerFunction') || ops?.ssr) {
        return null
      }

      // For client-side, generate proxies for server functions
      console.log('Transform client code:', id);

      const getModule = (fnName: string, fnEntry: string) => `
// RPC client for ${fnEntry}
export const ${fnEntry} = async (...args) => {
  const requestToken = await getToken();
  const response = await fetch('/__rpc/${fnName}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': requestToken
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
    `.trim();

      const transformedCode = `
        // Client-side methods
        const getToken = async () => {
          const tokenResponse = await fetch('/__rpc/token', { method: 'GET' });
          return tokenResponse.headers.get('X-CSRF-Token');
        }
        ${Array.from(functionMappings.entries())
          .map(([registeredName, exportName]) =>
            getModule(registeredName, exportName)
          )
          .join('\n')}
      `.trim();

      // const result = (await transformWithEsbuild(
      //   transformedCode,
      //   id,
      //   { loader: "js" },
      // ));

      return {
        code: transformedCode,
        map: null
      }
    },

    configureServer(server) {
      // Scan for server files when config is resolved
      scanForServerFiles(config.root)

      // Log registered functions
      console.log('Server functions:', Array.from(serverFunctionsMap.keys()))

      server.middlewares.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token')
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        next()
      });

      server.middlewares.use((req, res, next) => {
        if (req.method === 'GET') {
          // If it's just a token request, end here
          if (req.url === '/__rpc/token') {
            const csrfToken = createHash('sha256').update(Date.now().toString()).digest('hex');
            res.setHeader('X-CSRF-Token', csrfToken);
            res.end();
            return;
          }
        }
        next()
      });

      // Handle RPC calls
      server.middlewares.use(async (req, res, next) => {
        // if (!req.url?.startsWith('/__rpc/')) return next()
        if (!req.url?.startsWith('/__rpc/') || req.url === '/__rpc/token') return next();

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
          res.end(JSON.stringify({ error: `Function "${functionName}" not found` }))
          return
        }

        try {
          const body = await readBody(req)
          const args = JSON.parse(body || '[]')
          const result = await serverFunction.fn(...args)
          res.end(JSON.stringify({ data: result }))
        } catch (error) {
          console.error('RPC error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(error) }))
        }
      })
    }
  }
}
