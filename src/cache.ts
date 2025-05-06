// packages/vite-plugin-rpc/src/server/cache.ts
// 'use server'

import { type CacheEntry } from './types'

export class ServerCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map<string, {
    data: unknown
    timestamp: number
    promise?: Promise<unknown>
  }>()

  async get<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T>
    const now = Date.now()

    if (entry?.promise) return entry.promise
    if (entry && (now - entry.timestamp) < ttl) return entry.data

    const promise = fetcher().then(data => {
      this.cache.set(key, { data, timestamp: now })
      return data
    })

    this.cache.set(key, { ...entry, promise })
    return promise
  }

  invalidate(pattern?: string | string[] | RegExp | RegExp[]) {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string' && key.includes(pattern)) {
        this.cache.delete(key);
        break;
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        this.cache.delete(key);
        break;
      } else if (pattern instanceof Array) {
        for (const p of pattern) {
          if (typeof p === 'string' && key.includes(p)) {
            this.cache.delete(key);
            break;
          } else if (p instanceof RegExp && p.test(key)) {
            this.cache.delete(key);
            break;
          }
        }
      }
    }
  }
}

export const serverCache = new ServerCache()
