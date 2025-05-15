import { sayHi } from "./api"

export async function render(_url: string) {
  const greeting = await sayHi("John Doe");
  console.log(`SSR greeting "${greeting}"`);

  const html = `
    <div>
      <h1>Hello World!</h1>
      <p class="read-the-docs">
        Example using <code>vite-uni-rpc</code> with <code>fastify</code>
      </p>
      <p>Refresh page after 5s</p>
    </div>
  `
  return { html }
}
