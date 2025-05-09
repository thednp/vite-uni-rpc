# vite-mini-rpc

A Vite plugin for creating server functions with automatic remote procedure calls (RPC).

## Features

- File-level server code isolation without using directives like `'use server'`
- Automatic RPC generation for server functions
- Server-side caching with single-flight requests
- Built-in security with configurable CORS and CSRF protection
- Flexible middleware system with hooks support
- Rate limiting support
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
import { isExpressResponse, sendResponse } from "vite-mini-rpc/server";

export default defineConfig({
  plugins: [
    rpc({
      // Security Middlewares
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? 'https://your-site.com' 
          : true,
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Set-Cookie', 'Content-Type', 'X-CSRF-Token']
      },
      csrf: {
        expires: 24,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/'
      },
      // RPC Options
      rpcPreffix: '_myApi', // default is "__rpc"
      // Rate Limiting
      rateLimit: {
        max: 1000, // default is 100
        windowMs: 5 * 60 * 1000 // 5 minutes
      },
      // Optional Hooks
      onRequest: async (req) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      },
      onResponse: async (res) => {
        // handle differently depending on platform
        isExpressResponse(res) {
          res.set('X-Response-Time', Date.now());
        } else {
          res.setHeader('X-Response-Time', Date.now());
        }
      },
      onError: (error, req, res) => {
        console.error(`Error processing ${req.url}:`, error);
        // handle differently depending on environment or other conditions
        sendResponse(res, { error: 'Internal Server Error' }, 500);
      }
    }),
  ],
})
```

### Server Functions

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
  "say-hi", // cache-key
  (name: string) => {
    // the async function to be executed on the server side
    // can do database or file operations, etc
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
const handleResponse = async (response) => {
  if (!response.ok) throw new Error('Fetch error: ' + response.statusText);
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}

// Client-side RPC modules
export const sayHi = async (...args) => {
  // const requestToken = await getToken();
  const response = await fetch('/_myApi/say-hi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  });
  return handleResponse(response);
}
```

Create a `root/src/api/index.ts` file to export all necessary functions:

```ts
import { sayHi } from "./server";

export { sayHi };
```
Import from `index.ts` anywhere you need it.


### Middleware System

The plugin provides a simple API to create Vite / ExpressJS compatible middlewares, ranging from simple operations to complex RPC middlewares, fully type-safe and very configurable.

While you can do all that by hand every single time, it's nice to have them all under the same roof for full control and ease of maintenance. You can have an `middleware.config.ts` to hold all your middleware options to be used in both the vite dev server via the plugin interface, or your express / hono / deno / bun / etc server.


#### Create Basic Middleware

#### Example
Create a simple middleware:
```ts
// src/server/middleware.ts
import { createMiddleware, isExpressRequest } from "vite-mini-rpc/server";

const simpleMiddleware = createMiddleware({
  // Match specific paths
  path: /^\/_theme\//,
  // Custom headers
  headers: {
    'X-Custom-Header': 'value',
    'Cache-Control': 'no-cache'
  },
  // Rate limiting
  rateLimit: {
    max: 100,
    windowMs: 5 * 60 * 1000 // 5 minutes
  },
  // Request handler
  handler: async (req, res, next) => {
    // alternatively you can filter the requests by url
    // const url = isExpressRequest(req) ? req.originalUrl : req.url;
    // if (url.startsWith("_theme")) {}
    // handle to your taste, for instance you may like to
    // save the current theme in a user session and call next()

    // to make your middleware compatible with express/hono
    // you may have to distinguish from vite/express
    if (typeof next === "function") {
      next();
    },
  },
  // Lifecycle hooks
  onRequest: async (req) => {
    console.log(`Incoming request: ${req.url}`);
  },
  onResponse: async (res) => {
    if (isExpressResponse(res)) {
      res.set('X-Response-Time', Date.now());
    } else {
      res.setHeader('X-Response-Time', Date.now());
    }
  },
  onError: (error, req, res) => {
    console.error('Middleware custom error:', error);
  }
});
```

#### Server Integration
Use your middleware with vite in a custom plugin:

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

Use same middleware with your **Express** server:

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
  // BEFORE the catch all
  app.use("/_theme", simpleMiddleware);
  // use app.use(simpleMiddleware); // alternative if you filter url within the handler
}

app.use("*all", async (req, res) => {
  //.. handle your catch all
});
```
**Note** - you may need to use [tsx](https://tsx.is/) with the `tsx server.js` command or execute `node run --experimental-strip-types server.js` command when using TypeScript.


#### Middleware Options
```ts
export interface MiddlewareOptions {
  /**
   * Path pattern to match for middleware execution.
   * Accepts string or RegExp to filter requests based on URL path.
   *
   * @example
   * ```ts
   * // String path
   * path: "/api/v1"
   *
   * // RegExp pattern
   * path: /^\/api\/v[0-9]+/
   * ```
   */
  path?: string | RegExp;

  /**
   * Async handler for request processing.
   * Core middleware function that processes incoming requests.
   *
   * @param req - The incoming request object
   * @param res - The server response object
   * @param next - Function to pass control to the next middleware
   *
   * @example
   * ```ts
   * handler: async (req, res, next) => {
   *   // Process request
   *   const data = await processRequest(req);
   *
   *   // Send response
   *   sendResponse(res, { data }, 200);
   * }
   * ```
   */
  handler?: (
    req: IncomingMessage | Request,
    res: ServerResponse | Response,
    next: Connect.NextFunction,
  ) => unknown;

  /**
   * RPC prefix without leading slash (e.g. "__rpc")
   * Leading slash will be added automatically by the middleware.
   * This prefix defines the base path for all RPC endpoints.
   * @default undefined
   * @example
   * // Results in endpoints like: /api/rpc/myFunction
   * rpcPreffix: "api/rpc"
   */
  rpcPreffix?: string;

  /**
   * Custom headers to be set for middleware responses.
   * Use this to add specific headers to all responses handled by this middleware.
   *
   * @example
   * ```ts
   * headers: {
   *   'X-Custom-Header': 'custom-value',
   *   'Cache-Control': 'no-cache'
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Option to disable by setting `false` or customize RPC rate limiting.
   * Protects your RPC endpoints from abuse by limiting request frequency.
   * @default
   * ```
   * { max: 100, windowMs: 5 * 60 * 1000 }
   * // translates to 100 requests for each 5 minutes
   * ```
   */
  rateLimit?: {
    windowMs: number;
    max: number;
  } | false;

  /**
   * Custom error handling hook for RPC middleware errors.
   * Allows you to handle errors in a custom way instead of the default error response.
   *
   * @param error - The error thrown during request processing
   * @param req - The incoming request object
   * @param res - The server response object
   *
   * @example
   * ```ts
   * onError: (error, req, res) => {
   *   console.error(`[${new Date().toISOString()}] Error:`, error);
   *   // Custom error handling logic
   *   sendResponse(res, { error: "Custom error message" }, 500));
   * }
   * ```
   */
  onError?: (error: Error, req: IncomingMessage, res: ServerResponse) => void;

  /**
   * Hook executed before processing each RPC request.
   * Useful for request validation, logging, or custom authentication.
   * Must return void or a Promise that resolves to void.
   *
   * @param req - The incoming request object
   *
   * @example
   * ```ts
   * onRequest: async (req) => {
   *   // Log incoming requests
   *   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
   *
   *   // Add custom validation
   *   const apiKey = req.headers['x-api-key'];
   *   if (!apiKey) throw new Error('Missing API key');
   * }
   * ```
   */
  onRequest?: (req: Request | IncomingMessage) => void | Promise<void>;

  /**
   * Hook executed before sending each RPC response.
   * Useful for response modification, logging, or adding custom headers.
   * Must return void or a Promise that resolves to void.
   *
   * @param res - The server response object
   *
   * @example
   * ```ts
   * onResponse: async (res) => {
   *   // Add custom headers
   *   res.setHeader('X-Response-Time', Date.now());
   *
   *   // Log response metadata
   *   console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
   * }
   * ```
   */
  onResponse?: (res: Response | ServerResponse) => void | Promise<void>;
}
```


### License
Released under [MIT](LICENSE).
