import Fastify from "fastify";
// import FastifyVite from '@fastify/vite'
import fs from "node:fs/promises";
import process from "node:process";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";
const root = process.env.ROOT || process.cwd();

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile("./dist/client/index.html", "utf-8")
  : "";

// Create Fastify server
const app = Fastify({ logger: false });

// Add Vite or respective production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
    root,
  });
  app.addHook("onRequest", async(request, reply) => {
    const next = () => new Promise((resolve) => {
      vite.middlewares(request.raw, reply.raw, resolve);
    });
    await next();
  })
} else {
  // Load RPC configuration
  const { loadRPCConfig } = await import("vite-mini-rpc");
  const { createRPCMiddleware } = await import("vite-mini-rpc/fastify");
  const { adapter, ...options } = await loadRPCConfig();
  // console.log({createRPCMiddleware})
  const rpcMiddeware = createRPCMiddleware(options);
  
  // Register RPC middleware
  // await app.register((instance) => {
  //   instance.addHook("preHandler", rpcMiddeware);
  //   // instance.addHook("onRequest", rpcMiddeware);
  // });
  app.addHook("preHandler", async (request, reply) => {
    const next = () => new Promise(resolve => {
      rpcMiddeware(request, reply, resolve);
    })
    await next()
  })

  // Register other middleware
  await app.register(import("@fastify/compress")); // Compression
  await app.register(import('@fastify/static'), {
    root: root + '/dist/client/assets',
    prefix: '/assets/',
  });
}

// Serve HTML
app.get("*", async (req, reply) => {
  try {
    const url = req.url.replace(base, "");

    /** @type {string} */
    let template;
    /** @type {import('./src/entry-server.ts').render} */
    let render;
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile("./index.html", "utf-8");
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/src/entry-server.ts")).render;
    } else {
      template = templateHtml;
      render = (await import("./dist/server/entry-server.js")).render;
    }

    const rendered = await render(url);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? "")
      .replace(`<!--app-html-->`, rendered.html ?? "");

    reply.status(200).header("Content-Type", "text/html").send(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    reply.status(500).send(e.stack);
  }
});

// Start Fastify server
// await server.vite.ready();
app.listen({ port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Server started at http://localhost:${port}`);
});