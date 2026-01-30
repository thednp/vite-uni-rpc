// import { sayHi } from "./api";
// import type { ServerFunction } from "vite-uni-rpc";

export async function render(_url: string) {
  // const controller = new AbortController();
  // // // const cancel = (reason: string) => controller.abort(reason);
  // const greeting = await (sayHi as unknown as ServerFunction)(
  //   controller.signal,
  //   "John Doe",
  // );

  // console.log(`SSR greeting "${greeting}"`);

  const html = `
    <div>
      <h1>Hello World!</h1>
      <p class="read-the-docs">
        SSR Example using <code>vite-uni-rpc</code> with <code>express</code>
      </p>
      <p>Refresh page after 5s</p>
      <form>
        <h2>Form</h2>
        <div style="display: flex; align-items: center; gap: 10px">
          <label for="a">A</label>
          <input id="a" name="a" type="number" placeholder="Value A" />
          <div id="error-a" style="color: red"></div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px">
          <label for="b">B</label>
          <input id="b" name="b" type="text" placeholder="Value B" />
          <div id="error-b" style="color: red"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px">
          <label for="output">></label>
          <output id="output">Result: 0</output>

          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  `;
  return { html };
}
