import { sayHi } from "./api"

export async function render(_url: string) {
  const greeting = await sayHi("John Doe");
  console.log(`SSR greeting "${greeting}"`);

  const html = `
    <div>
      <h1>Hello World!</h1>
      <p class="read-the-docs">
        SSR Example using <code>vite-uni-rpc</code> with <code>express</code>
      </p>
      <p>Refresh page after 5s</p>
      <form>
        <h2>Form</h2>
        <label for="a">A</label>
        <input id="a" name="a" type="number" placeholder="Value A" />

        <label for="b">B</label>
        <input id="b" name="b" type="number" placeholder="Value B" />
        <button type="submit">Add</button>
      </form>
    </div>
  `
  return { html }
}
