import { defineConfig } from "vite";
// import rpc from "vite-uni-rpc";
import rpc from "../../src/index.ts";

export default defineConfig({
  // server: {
  //   hmr: {
  //     port: 3001, // Use a unique port per app
  //     clientPort: 3001,
  //   },
  // },
  plugins: [rpc()],
});
