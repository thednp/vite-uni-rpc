import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    express: 'src/express/index.ts',
    fastify: 'src/fastify/index.ts',
    hono: 'src/hono/index.ts',
  },
  
  esbuildOptions: (ops) => {
    ops.legalComments = "inline";
  },
  format: ['esm', 'cjs'],
  external: ['vite', "hono", "fastify", "express"],
  dts: true,
  splitting: true,
  clean: true,
});
