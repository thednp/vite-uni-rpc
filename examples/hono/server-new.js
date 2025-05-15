import fs from 'node:fs/promises';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5173;
const vitePort = 5174; // Separate port for Vite dev server
const base = process.env.BASE || '/';
const root = process.env.ROOT || process.cwd();

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : '';

// Create Hono app
const app = new Hono();

// Global middlewares
app.use(compress()); // Enable compression for all responses
app.use(
  "/*",
  cors({
    // origin: isProduction ? ['https://your-site.com'] : [`http://localhost:${port}`, `http://localhost:${vitePort}`],
    origin: [`http://localhost:${port}`, `http://localhost:${vitePort}`],
    credentials: true,
  })
);

// Add Vite or production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { port: vitePort },
    appType: 'custom',
    base: `http://localhost:${vitePort}/`, // Absolute base for asset URLs
    root,
  });
  await vite.listen();
} else {
  // Serve static assets from './dist/client'
  app.use(
    `/*`,
    serveStatic({
      root: './dist/client',
      // rewriteRequestPath: (path) => path.replace(base, ''),
      onNotFound: () => {}, // Suppress 404 logs for static assets; let SSR handle them
    })
  );

  // Load RPC configuration (assuming Hono-compatible middleware)
  const { loadRPCConfig } = await import('vite-uni-rpc');
  const { createRPCMiddleware } = await import('vite-uni-rpc/hono'); // Placeholder; adapt if needed
  const { adapter, ...options } = await loadRPCConfig();
  app.use(createRPCMiddleware(options));

}

// Serve HTML with SSR
app.get('*', async (c) => {

  try {
    // Normalize URL: strip base and ensure proper path
    const fullPath = c.req.path;
    const url = base === '/' ? fullPath : fullPath.replace(new RegExp(`^${base}`), '');

    /** @type {string} */
    let template;
    /** @type {import('./src/entry-server.ts').render} */
    let render;
    if (!isProduction) {
      // Development: Use Vite’s dev server
      template = await fs.readFile('./index.html', 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render;
    } else {
      // Production: Use cached template and compiled render
      template = templateHtml;
      render = (await import('./dist/server/entry-server.js')).render;
    }

    const rendered = await render(url);
    if (!rendered) {
      throw new Error('Render function returned no output');
    }

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '');

    return c.html(html, 200);
  } catch (e) {
    if (!isProduction) {
      vite?.ssrFixStacktrace(e);
    }
    console.error('SSR Error:', e.stack);
    return c.text(`Internal Server Error: ${e.message}`, 500);
  }
});

// Error handling for unmatched routes
app.notFound((c) => {
  return c.text('404 - Not Found', 404);
});

// Start Hono server
serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Server started at http://localhost:${port}`);
    if (!isProduction) {
      console.log(`Vite dev server running at http://localhost:${vitePort}`);
    }
  }
);