import { defineConfig } from 'vite';
import rpc from 'vite-uni-rpc';
// import devServer from "@hono/vite-dev-server"

export default defineConfig({
  server: {
    cors: false,
  },
  plugins: [
    rpc(
      // { rpcPreffix: "/_sv"}
    ),
    // devServer({
    //   entry: "./server.js",
    //   exclude: [
    //     /^\/@.+$/,
    //     /.*\.(ts|tsx|vue)($|\?)/,
    //     /.*\.(s?css|less)($|\?)/,
    //     /^\/favicon\.ico$/,
    //     /.*\.(svg|png)($|\?)/,
    //     /^\/(public|assets|static)\/.+/,
    //     /^\/node_modules\/.*/
    //   ],
    //   injectClientScript: false,
    // }),
  ]
});
