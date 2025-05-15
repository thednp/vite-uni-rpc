import fs from 'node:fs/promises'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
// import process from 'node:process'

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 5173
const base = process.env.BASE || '/'
const root = process.env.ROOT || process.cwd()

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''

// Create http server
const app = new Hono()
// app.use(compress());

app.use(
  cors({
    origin: [`http://localhost:${port}`],
    credentials: true,
  })
);

console.log({ isProduction, port, base, root, app })


// Add Vite or respective production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite
if (!isProduction) {
  // TO DO
  // const { createServer } = await import('vite')
  // vite = await createServer({
  //   server: { middlewareMode: true },
  //   appType: 'custom',
  //   base,
  //   root,
  // })
  // // app.use(Connect(vite.middlewares))
  // app.use(async (c, next) => {

  //   const done = async (resolve) => {
  //     // await next()
  //     vite.middlewares(c.req.raw, c.res.raw, next())
  //   };
  //   await done();
  // })
} else {
  // Serve static assets from './dist/client'
  app.use(
    `/*`,
    serveStatic({
      root: './dist/client/',
      // rewriteRequestPath: (path) => path.replace(base, ''),
    })
  );

  // load RPC configuration
  // const { loadRPCConfig } = await import("vite-uni-rpc");
  // const { createRPCMiddleware } = await import("vite-uni-rpc/hono");
  // const { adapter, ...options } = await loadRPCConfig();
  // app.use(createRPCMiddleware(options));

  // other middleware
  
}

console.log("before render");

// Serve HTML
app.get(`*`, async (c, next) => {
  console.log({ req: c.req },)

  try {
    // const url = c.req.url;
    const fullPath = c.req.path;
    const url = base === '/' ? fullPath : fullPath.replace(new RegExp(`^${base}`), '');

    /** @type {string} */
    let template
    /** @type {import('./src/entry-server.ts').render} */
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }
    console.log({render})

    const rendered = await render(url)
    // if (!rendered) {
    //   return next()
    // }

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')
    console.log(html)
    // c.status(200)
    // c.res.headers.set( 'Content-Type', 'text/html' )
    await next()
    return c.html(html, 200);
    // await next()
  } catch (e) {
    // vite?.ssrFixStacktrace(e)
    // console.log(e.stack)
    // // c.status(500)
    // // c.text(e.stack)
    // return c.text(e.stack, 500)
    if (!isProduction) {
      vite?.ssrFixStacktrace(e);
    }
    console.error('SSR Error:', e.stack);
    await next()

    return c.text(`Internal Server Error: ${e.message}`, 500);
  }
})


// Start http server
function startServer() {
  console.log(`Server started at http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    port: Number(port),
  })
  // serve(app)
}

startServer();

// export default app