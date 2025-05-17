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

### Installation

```bash
npm install vite-uni-rpc@latest
```


### Wiki

Please refer to the [Wiki](https://github.com/thednp/vite-uni-rpc/wiki) for guides on installation, configuration and usage.


### TO DO

- [x] Add examples
- [ ] Add wiki
- [x] Add SPA support
- [ ] Add multipart/form-data support
- [ ] Add Github tooling/workflows
- [ ] Add tests


### Credits

This project is inspired by [vite-dev-rpc](https://github.com/antfu/vite-dev-rpc).


### License
Released under [MIT](LICENSE).
