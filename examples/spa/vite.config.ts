import { defineConfig } from "vite";
// import { default as rpc, loadRPCConfig } from "vite-uni-rpc";
import { default as rpc, loadRPCConfig } from "../../src/index.ts";

export default defineConfig(async ({ isPreview }) => {
  const rpcConfig = await loadRPCConfig();
  const proxyPort = 3000;

  if (isPreview) {
    const { startProxyServer } = await import("./server.ts");
    await startProxyServer(proxyPort);
  }

  return {
    plugins: [rpc()],
    server: {
      strictPort: true,
      // hmr: {
      //   port: 3001, // Use a unique port per app
      //   clientPort: 3001,
      // },
    },
    preview: {
      port: 5173,
      strictPort: true,
      proxy: {
        [`/${rpcConfig.rpcPreffix}`]: {
          target: `http://localhost:${proxyPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
