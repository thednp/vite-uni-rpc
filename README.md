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

| Example             | Source Code                                                                   | Try online                                                                                      |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| SPA - node:http     | [SPA](https://github.com/thednp/vite-uni-rpc/tree/main/examples/spa)          | [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/spa)     |            
| Express             | [Express](https://github.com/thednp/vite-uni-rpc/tree/main/examples/express)  | [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/express) |
| Fastify             | [Fastify](https://github.com/thednp/vite-uni-rpc/tree/main/examples/fastify)  | [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/fastify) |
| Hono                | [Hono](https://github.com/thednp/vite-uni-rpc/tree/main/examples/hono)        | [StackBlitz](https://stackblitz.com/fork/github/thednp/vite-uni-rpc/tree/main/examples/hono)    |


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

- [ ] Add/update examples examples
- [x] Add SPA support
- [x] Add wiki
- [x] Test bun
- [x] Add `contentType` option to `createServerFunction`, currently supporting: `application/json`, `text/plain`;
- [ ] Add koa adapter
- [ ] Add Github tooling/workflows
- [ ] Add tests


### Credits

This project is inspired by [vite-dev-rpc](https://github.com/antfu/vite-dev-rpc).


### License
Released under [MIT](LICENSE).
