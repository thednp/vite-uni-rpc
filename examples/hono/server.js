import fs from 'node:fs/promises';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { compress } from 'hono/compress';
// import { cors } from 'hono/cors';
import { createServer as createViteServer } from 'vite';
import { createViteRouter } from './hono-vite-router.ts';
import { loadRPCConfig } from "vite-uni-rpc";

const rpcConfig = await loadRPCConfig();

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5173;
const base = process.env.BASE || '/';
const root = process.env.ROOT || process.cwd();

const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : '';

const app = new Hono();

let vite;
if (!isProduction) {
  vite = await createViteServer({
    server: { middlewareMode: true, },
    appType: 'custom',
    base,
    root,
  });
  app.use(createViteRouter(vite, rpcConfig.rpcPreffix));
} else {
  app.use(compress());
  app.use(
    cors({
      origin: isProduction
        ? ['https://your-site.com']
        : [`http://localhost:${port}`],
      credentials: true,
    })
  );
  app.use(
    `${base}*`,
    serveStatic({
      root: './dist/client',
      // rewriteRequestPath: (path) => path.replace(base, ''),
      // onNotFound: () => {},
    })
  );
}

app.get('*', async (c) => {
  const path = c.req.path;
  console.log("[hono] Requesting " + path);

  try {
    const url = base === '/' ? path : path.replace(new RegExp(`^${base}`), '');
    // const url = c.req.path;

    let template;
    let render;

    if (!isProduction) {
      // if (!vite) throw new Error('Vite server not initialized');
      template = await fs.readFile('./index.html', 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render;
    } else {
      template = templateHtml;
      render = (await import('./dist/server/entry-server.js')).render;
    }

    const rendered = await render(url);
    const html = template
      .replace(`<!--ssr-head-->`, rendered.head ?? '')
      .replace(`<!--ssr-body-->`, rendered.body ?? '');

    // await next();
    return c.html(html, 200);
  } catch (e) {
    if (!isProduction && vite) {
      vite.ssrFixStacktrace(e);
    }
    console.error('[SSR] Error:', e.stack);
    return c.text('Internal Server Error', 500);
  }
});

app.notFound((c) => {
  return c.text('404 - Not Found', 404);
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Server started at http://localhost:${port}`);
  }
);

export default app;
