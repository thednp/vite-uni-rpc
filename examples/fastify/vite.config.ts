import { resolve } from 'node:path'
import { defineConfig } from 'vite';
import rpc from 'vite-mini-rpc';
// import viteFastify from '@fastify/vite/plugin'

export default defineConfig({
  root: resolve(import.meta.dirname),
  plugins: [
    rpc(),
    // viteFastify(),
  ]
});
