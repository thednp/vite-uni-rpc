import { defineConfig } from 'vite';
import rpc from 'vite-mini-rpc';

export default defineConfig({
  plugins: [rpc()]
});
