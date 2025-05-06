import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    server: 'src/server.ts'
  },
  format: ['esm', 'cjs'],
//   dts: true,
  splitting: false,
  clean: true,
});
