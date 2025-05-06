# vite-plugin-rpc

A Vite plugin for handling server functions with automatic RPC generation, single-flight requests, and server-side caching.

## Features

- File-level and function-level server code isolation using 'use server' directive
- Automatic RPC generation for server functions
- Server-side caching with single-flight requests
- Built-in CSRF protection
- Framework agnostic
- TypeScript support

## Installation

```bash
npm install vite-plugin-rpc@latest
```

```bash
# or
pnpm add vite-plugin-rpc@latest
```

```bash
# or
deno add npm:vite-plugin-rpc@latest
```

## Usage

```ts
import { defineConfig } from 'vite'
import rpc from 'vite-plugin-rpc'

export default defineConfig({
  plugins: [rpc()]
})
```