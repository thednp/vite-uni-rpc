import { defineConfig } from "vite";
import { default as rpc, loadRPCConfig } from "vite-uni-rpc";
import colors from "picocolors";

const rpcConfig = await loadRPCConfig();

export default defineConfig(async ({ isPreview }) => {
  if (isPreview) {
    const { createServer } = await import("node:http");
    const { createRPCMiddleware } = await import("vite-uni-rpc/express");
    const middleware = createRPCMiddleware(rpcConfig);

    const server = createServer(async (req, res) => {
      await middleware(req, res, () => true);
    });
    
    server.listen(3000, () => {
      console.log(`  ${colors.green("➜")}  ${colors.bold("RPC Backend")}: ${colors.cyan("http://localhost:" + colors.bold("3000" + "/"))}`);
    });
  }

  return {
    plugins: [rpc()],
    preview: {
      port: 5173,
      proxy: {
        [`/${rpcConfig.rpcPreffix}`]: {
          target: `http://localhost:3000`, // Replace with production backend URL
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
