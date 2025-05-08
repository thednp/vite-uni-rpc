# vite-mini-rpc

A Vite plugin for creating server functions with automatic remote procedure calls (RPC) generation, server-side caching and other server tools.

## Features

- File-level server code isolation without using directives like `'use server'`
- Automatic RPC generation for server functions
- Server-side caching with single-flight requests
- Built-in configurable CORS and CSRF protection
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
    rpc({
      // default is "__rpc"
      urlPrefix: "_server",
      // time to live default is 10000 (10s)
      ttl: 15000
    }),
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

Server Function Options:
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


### Middleware

The plugin provides a simple API to create Vite / ExpressJS compatible middlewares, ranging from simple operations to complex RPC middlewares, fully type-safe and very configurable.

While you can do all that by hand every single time, it's nice to have them all under the same roof for full control and ease of maintenance. You can have an `app.config.ts` to hold all your middleware options to be used in both the vite dev server and your express / hono / deno / bun / etc server.


### createMiddleware

#### Example
Create a new but simple middleware:
```ts
// src/server/middleware.ts
import { createMiddleware } from "vite-mini-rpc/server";

const simpleMiddleware = createMiddleware({
  path: /^\/_theme\//,
  handler: async (req, res, next) => {
    // handle to your taste, for instance you may like to
    // save the current theme in a user session and call next()

    // to make your middleware compatible with express/hono
    // you may have to distinguish from vite/express
    if (typeof next === "function") {
      next();
    }
  },
  // ... other options
});
```

Use your middleware with vite:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { simpleMiddleware } from "./src/server/middleware.ts"

// create a custom plugin
function myPlugin() {
  return {
    name: 'my-plugin-name',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(simpleMiddleware);
    },
  };
}

// use the custom plugin in your vite configuration
export default defineConfig({
  plugins: [myPlugin()],
});

```

Use same middleware with your express server:

```js
// /server.js
import express from "express";
import { simpleMiddleware } from "./src/server/middleware.ts"

// Create http server
const app = express();

let vite;
if (process.env.MODE === "development") {
  // kickstart your vite dev server here
} else {
  // in production make sure to enable your middlewares
  app.use("/_theme", simpleMiddleware);
}

app.use("*", async (req, res) => {
  //.. handle your catch all
});
```

#### Middleware Options
```ts
export interface MiddlewareOptions {
  /** RPC endpoint prefix */
  rpcPrefix?: string;
  /** Path pattern to match for middleware execution */
  path?: string | RegExp;
  /** Custom headers to set */
  headers?: Record<string, string>;
  /** Rate limiting */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  /** Async handler for request processing */
  handler?: (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => unknown;
  /** Error handling */
  onError?: (error: Error, req: IncomingMessage, res: ServerResponse) => void;
}
```

**Note** - you may need to use [tsx](https://tsx.is/) with the `tsx server.js` command or execute `node run --experimental-strip-types server.js` command when using TypeScript.


### License
Released under [MIT](LICENSE).
