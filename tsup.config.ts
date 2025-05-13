import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    express: 'src/express/index.ts',
    fastify: 'src/fastify/index.ts',
    hono: 'src/hono/index.ts',
  },
  
  esbuildOptions: (ops) => {
    ops.legalComments = "inline";
  },
  format: ['esm', 'cjs'],
  external: ['vite', "hono", "fastify", "fastify-plugin", "express"],
  dts: true,
  splitting: true,
  clean: true,
});
