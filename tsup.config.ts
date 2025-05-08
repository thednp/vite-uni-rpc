import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts'
  },
  format: ['esm', 'cjs'],
  external: ['vite', 'cors'],
  dts: true,
  splitting: true,
  clean: true,
});
