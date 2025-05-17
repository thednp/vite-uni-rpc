import { defineConfig } from "vite";
import { default as rpc, loadRPCConfig } from "vite-uni-rpc";

export default defineConfig(
  async ({ isPreview }) => {
    const rpcConfig = await loadRPCConfig();
    const proxyPort = 3000;

    if (isPreview) {
      const { startProxyServer } = await import("./server.ts");
      await startProxyServer(proxyPort);
    }

    return {
      plugins: [rpc()],
      preview: {
        port: 5173,
        proxy: {
          [`/${rpcConfig.rpcPreffix}`]: {
            target: `http://localhost:${proxyPort}`,
            changeOrigin: true,
            secure: false,
          },
        },
      },
    };
  },
);
