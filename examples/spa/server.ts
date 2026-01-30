export const startProxyServer = async (port: number = 3000) => {
  const { createServer } = await import("node:http");
  const colors = (await import("picocolors")).default;
  // const { loadRPCConfig } = await import("vite-uni-rpc");
  // const { createRPCMiddleware } = await import("vite-uni-rpc/express");
  const { loadRPCConfig } = await import("../../src/index.ts");
  const { createRPCMiddleware } = await import("../../src/express/index.ts");
  const rpcConfig = await loadRPCConfig();
  const middleware = createRPCMiddleware(rpcConfig);

  const httpServer = createServer(async (req, res) => {
    const next = () =>
      new Promise((resolve) => {
        middleware(req, res, resolve);
      });
    await next();
  });

  httpServer.listen(port, () => {
    console.log(
      `  ${colors.green("➜")}  ${colors.bold("RPC Backend")}: ${colors.cyan(
        "http://localhost:" + colors.bold(port + "/"),
      )}`,
    );
  });
};
