// packages/vite-plugin-trpc/client.ts
export type ServerFunction<TArgs extends unknown[], TResult> = {
  (...args: TArgs): Promise<TResult>
  __fn__: (...args: TArgs) => Promise<TResult>
}

export async function createServerProxy<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>
): Promise<ServerFunction<TArgs, TResult>> {
  const proxyFn = async (...args: TArgs): Promise<TResult> => {
    try {
      const response = await fetch('/__rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          args,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      return result.data as TResult
    } catch (error) {
      console.error('RPC call failed:', error)
      throw error
    }
  }

    // Attach the original function for type information
    ; (proxyFn as any).__fn__ = fn

  return proxyFn as ServerFunction<TArgs, TResult>
}

export function isServerFunction(fn: unknown): fn is ServerFunction<any[], any> {
  return typeof fn === 'function' && '__fn__' in fn
}
