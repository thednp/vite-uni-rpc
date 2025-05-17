## vite-uni-rpc

A Vite plugin for creating server functions with automatic Remote Procedure Calls generation.

### Features

- File-level server code isolation without using directives like `'use server'`
- System wide configuration via vite style config file
- Automatic RPC generation for server functions
- Server-side caching with single-flight requests
- Flexible middleware system with hooks support and adapters for `express`, `fastify` and `hono`
- Framework agnostic
- TypeScript support


### Examples

* [SPA](https://github.com/thednp/vite-uni-rpc/tree/main/examples/spa): a simple Single Page App with a `node:http` proxy to reply to RPC calls, [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/spa)
* [Express](https://github.com/thednp/vite-uni-rpc/tree/main/examples/express): a simple Server Side Rendering app with `express` backend, [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/express)
* [Fastify](https://github.com/thednp/vite-uni-rpc/tree/main/examples/fastify): a simple Server Side Rendering app with `fastify` backend, [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/fastify)
* [Hono](https://github.com/thednp/vite-uni-rpc/tree/main/examples/hono): a simple Server Side Rendering app with `hono` backend, [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/hono)


### Installation

```bash
npm install vite-uni-rpc@latest
```

```bash
pnpm add vite-uni-rpc@latest
```


### Wiki

Please refer to the [Wiki](https://github.com/thednp/vite-uni-rpc/wiki) for guides on installation, configuration and usage.


### TO DO

- [x] Add examples
- [x] Add SPA support
- [x] Add wiki
- [ ] Add koa adapter
- [ ] Test bun
- [ ] Add `multipart/form-data` support via `contentType` option
- [ ] Add Github tooling/workflows
- [ ] Add tests


### Credits

This project is inspired by [vite-dev-rpc](https://github.com/antfu/vite-dev-rpc).


### License
Released under [MIT](LICENSE).
