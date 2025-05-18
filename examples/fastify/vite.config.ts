import { defineConfig } from 'vite';
import rpc from 'vite-uni-rpc';

export default defineConfig({
  plugins: [rpc()]
});
