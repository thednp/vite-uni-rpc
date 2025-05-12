import Fastify from "fastify";
// import FastifyVite from '@fastify/vite'
import fs from "node:fs/promises";
import process from "node:process";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";
const root = process.env.ROOT || process.cwd();

const development = {
  logger: true
};

const production = {
  logger: false
};

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile("./dist/client/index.html", "utf-8")
  : "";

// Create Fastify server
const app = Fastify(isProduction ? production : development);

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
  app.addHook("onRequest", async (request, reply) => {
    const next = () => new Promise((resolve) => {
      vite.middlewares(request.raw, reply.raw, resolve);
    });
    await next();
  })
  // Fastify-vite provides better integration, but for direct compatibility, we wrap Vite middlewares
  // app.register(async (instance) => {
  //   instance.addHook("onRequest", (req, reply, done) => {
  //     const expressReq = req.raw; // Fastify's raw request is compatible with Express middleware
  //     const expressRes = reply.raw;
  //     expressRes.status = (code) => {
  //       reply.status(code);
  //       return expressRes;
  //     };
  //     expressRes.set = (key, value) => {
  //       reply.header(key, value);
  //       return expressRes;
  //     };
  //     expressRes.send = (body) => {
  //       reply.send(body);
  //     };
  //     vite.middlewares(expressReq, expressRes, done);
  //   });
  // });
  // await app.register(FastifyVite, {
  //   root: import.meta.dirname, // where to look for vite.config.js
  //   dev: process.argv.includes('--dev'),
  //   spa: true
  // })
} else {
  const fastifyCompress = import("@fastify/compress");
  const fastifyStatic = import("@fastify/static");
  // Load RPC configuration
  const { loadRPCConfig } = await import("vite-mini-rpc");
  const { createRPCMiddleware } = await import("vite-mini-rpc/fastify");
  const { adapter, ...options } = loadRPCConfig();
  
  // Register RPC middleware
  await app.register(async (instance) => {
    instance.addHook("preHandler", createRPCMiddleware(options));
  });

  // Register other middleware
  await app.register(fastifyCompress); // Compression
  await app.register(fastifyStatic, {
    root: new URL("./dist/client", import.meta.url).pathname,
    prefix: base,
    extensions: [], // Matches sirv's behavior
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