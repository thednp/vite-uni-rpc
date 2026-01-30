// vite-uni-rpc/src/utils.ts
import type { RpcPluginOptions, ServerFunctionOptions } from "./types.d.ts";

import { serverFunctionsMap, functionMappings } from "./functionsMap.ts";

const getModule = (
  fnName: string,
  fnEntry: string,
  options: Partial<ServerFunctionOptions> & {
    contentType: ServerFunctionOptions["contentType"];
    rpcPreffix: string;
  },
) => {
  console.log("getModule.options", options);
  let bodyHandling;
  switch (options.contentType) {
    case "text/plain":
      bodyHandling = `
    const body = args[0];
    const headers = {
      'Content-Type': 'text/plain'
    };`;
      break;
    default:
      bodyHandling = `
    const body = JSON.stringify(args);
    const headers = {
      'Content-Type': 'application/json'
    };`;
  }

  return `
  export const ${fnEntry} = (...args) => {
    const controller = new AbortController();
    const cancel = (reason) => controller.abort(reason);
    ${bodyHandling}
    // const fetcher = async () => {
    //   const response = await fetch('/${options.rpcPreffix}/${fnName}', {
    //     method: 'POST',
    //     headers: headers,
    //     credentials: 'include',
    //     body: body,
    //     signal: controller.signal,
    //   });
    //   return await handleResponse(response);
    // }
    const fetcher = async () => {
      try {
      const response = await fetch('/${options.rpcPreffix}/${fnName}', {
          method: "POST",
          headers,
          credentials: "include",
          body,
          signal: controller.signal
        });
        return await handleResponse(response);
      } catch (err) {
        // ✅ Handle abort specifically
        if (err.name === "AbortError") {
          throw new Error("Request cancelled by user");
        }
        throw err;
      }
    };

    return {
      data: fetcher(),
      cancel,
    };
  }`;
};

export const getClientModules = (initialOptions: RpcPluginOptions) => {
  console.log("getClientModules.functionMappings", functionMappings);
  return `
// Client-side RPC modules
const handleResponse = async (response) => {
  console.log("handleResponse", response)
  if (!response.ok) {
    if (response.status === 499 || response.status === 408) {
      throw new Error("Request was cancelled");
    }
    throw new Error('Fetch error: ' + response.statusText);
  }
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}
${Array.from(functionMappings.entries())
  .map(([registeredName, exportName]) =>
    getModule(registeredName, exportName, {
      ...initialOptions,
      ...((serverFunctionsMap.get(registeredName)
        ?.options as ServerFunctionOptions) || {}),
    }),
  )
  .join("\n")}
`.trim();
};
