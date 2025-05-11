import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    express: 'src/express/index.ts',
    hono: 'src/hono/index.ts'
  },
  
  esbuildOptions: (ops) => {
    ops.legalComments = "inline";
  },
  format: ['esm', 'cjs'],
  external: ['vite', 'cors', "hono"],
  // dts: true,
  splitting: true,
  clean: true,
});
