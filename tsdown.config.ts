import { defineConfig, type UserConfig } from "tsdown";
import strip from "vite-plugin-strip-comments";

const sharedCfg: UserConfig = {
  target: "esnext",
  format: ["esm"],
  external: ["vite", "hono", "fastify", "express", "formidable", "picocolors"],
  treeshake: true,
  plugins: [strip({ type: "keep-jsdoc" })],
  exports: true,
  dts: {
    sourcemap: true,
    sideEffects: false,
  },
  skipNodeModulesBundle: true,
  // clean: true,
};

export default defineConfig([
  {
    ...sharedCfg,
    clean: true,
    entry: {
      index: "src/index.ts",
    },
    outDir: "dist",
  },
  {
    ...sharedCfg,
    entry: {
      server: "src/server.ts",
    },
    outDir: "dist/server",
  },
  {
    ...sharedCfg,
    entry: {
      express: "src/express/index.ts",
    },
    outDir: "dist/express",
  },
  {
    ...sharedCfg,
    entry: {
      fastify: "src/fastify/index.ts",
    },
    outDir: "dist/fastify",
  },
  {
    ...sharedCfg,
    entry: {
      "fastify/plugin": "src/fastify/plugin.ts",
    },
    outDir: "dist/fastify/plugin",
  },
  {
    ...sharedCfg,
    entry: {
      hono: "src/hono/index.ts",
    },
    outDir: "dist/hono",
  },
]);
