# vite-mini-rpc

A Vite plugin for creating server functions with automatic remote procedure calls (RPC) generation, server-side caching.

## Features

- File-level server code isolation without using directives like `'use server'`
- Automatic RPC generation for server functions
- Server-side caching with single-flight requests
- Built-in CSRF protection
- Framework agnostic
- TypeScript support

## Installation

```bash
npm install vite-mini-rpc@latest
```

```bash
# or
pnpm add vite-mini-rpc@latest
```

```bash
# or
deno add npm:vite-mini-rpc@latest
```

```bash
# or
bun add vite-mini-rpc@latest
```

## Usage

### Vite Configuration

```ts
import { defineConfig } from 'vite';
import rpc from 'vite-mini-rpc';

export default defineConfig({
  plugins: [
    rpc(),
  ],
})
```

### Create Server Functions

Create a new folder `api` in your project `root/src` folder and add a new file `server.ts` or `server.js`:

```bash
root/
├── src/
│   └── api
│       │── index.ts
│       └── server.ts
│   [...others]
└── package.json
```
**Very important**: you must use this exact file structure for the plugin to work. 


Add your server functions in the new file:

```ts
// src/api/server.ts
import { createServerFunction } from "vite-mini-rpc/server";

export const sayHi = createServerFunction(
  "say-hi", // the name is required for cache-key purposes
  (name: string) => { // the sync/async function to be executed on the server side
    return `Hello ${name}!`;
  },
  { // set a series of cache options
    
    ttl: 10000, // Time to live: how many miliseconds to keep the cache
    invalidateKeys: []; // when this function is executed, it will automatically invalidate these keys
  }
);
```

Very easy options:
```ts
export interface ServerFunctionOptions {
  // Time to live: how many miliseconds to keep the cache
  ttl?: number;
  // invalidate keys when executing the function
  invalidateKeys?: string | RegExp | RegExp[] | string[];
}
```


The `server.ts` file will have the following output in the client:

```js
// src/api/server.ts
// Client-side RPC modules
export const sayHi = async (...args) => {
  // const requestToken = await getToken();
  const response = await fetch('/__rpc/say-hi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error('RPC call failed: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return JSON.parse(JSON.stringify(result)).data;
}
```

Create a `root/src/api/index.ts` file to export all necessary functions:

```ts
import { sayHi } from "./server";

export { sayHi };
```

Import from `index.ts` anywhere you need it.

### License
Released under [MIT](LICENSE).
