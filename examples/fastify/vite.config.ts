import { resolve } from 'node:path'
import { defineConfig } from 'vite';
import rpc from 'vite-mini-rpc';
// import viteFastify from '@fastify/vite/plugin'

export default defineConfig({
  esbuild: {
    // esbuild options
    exclude: ['vite'] // Specify the module to be excluded from the bundle
  },
  // root: resolve(import.meta.dirname),
  plugins: [
    rpc(),
    // viteFastify(),
  ]
});
