import fs from "node:fs/promises"
import { Hono } from 'hono'
import { serve } from "@hono/node-server"
import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 3000
const base = process.env.BASE || '/'
const root = process.env.ROOT || process.cwd()

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''

const app = new Hono()
app.use(compress())

if (isProduction) {
  app.use("/*", serveStatic({
    root: `./dist/client/`,
  }))

  // Serve static assets from './dist/client'
  app.use(
    `/*`,
    serveStatic({
      root: './dist/client',
      // rewriteRequestPath: (path) => path.replace(base, ''),
      // onNotFound: () => {}, // Suppress 404 logs for static assets; let SSR handle them
    })
  );

  // Load RPC configuration (assuming Hono-compatible middleware)
  const { loadRPCConfig } = await import('vite-uni-rpc');
  const { createRPCMiddleware } = await import('vite-uni-rpc/hono'); // Placeholder; adapt if needed
  const { adapter, ...options } = await loadRPCConfig();
  app.use(createRPCMiddleware(options));
}

app.get("*", async (c, next) => {
    // const url = c.req.url;
    const fullPath = c.req.path;
    const url = base === '/' ? fullPath : fullPath.replace(new RegExp(`^${base}`), '');

    /** @type {string} */
    let template
    /** @type {import('./src/entry-server.ts').render} */
    let render
    // if (!isProduction) {
    //   // Always read fresh template in development
    //   template = await fs.readFile('./index.html', 'utf-8')
    //   template = await vite.transformIndexHtml(url, template)
    //   render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    // } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    // }
    console.log({render})

    const rendered = await render(url)
    if (!rendered) {
      return next()
    }

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')
    console.log(html)
    // c.status(200)
    // c.res.headers.set( 'Content-Type', 'text/html' )
    await next()
    return c.html(html, 200);
})

if (isProduction) {
  console.log(`Server listening on http://localhost:${port}`);
  serve({
      fetch: app.fetch,
      port: port
  });
}

export default app
