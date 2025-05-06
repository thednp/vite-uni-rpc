import { defineConfig } from 'vite';
import { serverMiddleware } from './src/middleware';

export default defineConfig({
  plugins: [
    serverMiddleware()
  ],
});