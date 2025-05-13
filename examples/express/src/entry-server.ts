import { App } from "./App";
// import { renderPreloadLinks } from "./util/util";

export function render(_url: string) {
  const html = App();
  return { html }
}
