import { defineConfig, type Plugin } from "vite";
// import { default as rpc, loadRPCConfig } from "vite-uni-rpc";
import { default as rpc, loadRPCConfig } from "../../src/index.ts";

export default defineConfig(async (config) => {
  const rpcConfig = await loadRPCConfig();
  const proxyPort = 3000;

  if (config.isPreview) {
    const { startProxyServer } = await import("./server.ts");
    await startProxyServer(proxyPort);
  }

  return {
    plugins: [rpc() as Plugin],
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
});
