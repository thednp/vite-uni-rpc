import { createServer } from "vite";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

//#region src/functionsMap.ts
const serverFunctionsMap = /* @__PURE__ */ new Map();
const functionMappings = /* @__PURE__ */ new Map();

//#endregion
//#region src/scanForServerFiles.ts
let isScanned = false;
const scanForServerFiles = async (initialCfg, devServer) => {
	if (isScanned && !devServer) return;
	functionMappings.clear();
	let server = devServer;
	const config = !initialCfg && !devServer || !initialCfg ? {
		root: process.cwd(),
		base: process.env.BASE || "/",
		server: { middlewareMode: true }
	} : {
		...initialCfg,
		root: process.cwd()
	};
	if (!server) server = await createServer({
		server: config.server,
		appType: "custom",
		base: config.base,
		root: config.root
	});
	const svFiles = [
		"server.ts",
		"server.js",
		"server.mjs",
		"server.mts"
	];
	const apiDir = join(config.root, "src", "api");
	const files = (await readdir(apiDir, { withFileTypes: true })).filter((f) => svFiles.some((fn) => f.name.includes(fn))).map((f) => join(apiDir, f.name));
	try {
		for (const file of files) try {
			const moduleExports = await server.ssrLoadModule(file);
			const moduleEntries = Object.entries(moduleExports);
			if (!moduleEntries.length) {
				console.warn("No server function found.");
				if (!devServer && server) await server.close();
				return;
			}
			console.log({ moduleEntries });
			for (const [exportName, exportValue] of moduleEntries) serverFunctionsMap.set(exportName, {
				name: exportName,
				fn: exportValue
			});
			for (const [exportName, exportValue] of moduleEntries) {
				console.log({
					exportName,
					exportValue,
					serverFunctionsMap
				});
				for (const [registeredName, serverFn] of serverFunctionsMap.entries()) {
					console.log({
						registeredName,
						serverFn
					});
					if (serverFn.name === registeredName && serverFn.fn === exportValue) functionMappings.set(registeredName, exportName);
				}
			}
		} catch (error) {
			console.error("Error loading file:", file, error);
		}
	} finally {
		if (!devServer && server) await server.close();
		isScanned = true;
	}
	console.log({ files }, isScanned, functionMappings, serverFunctionsMap);
};

//#endregion
//#region src/options.ts
const defaultServerFnOptions = {
	contentType: "application/json",
	ttl: 10 * 1e3,
	invalidateKeys: []
};
const defaultRPCOptions = {
	rpcPreffix: "__rpc",
	adapter: "express",
	headers: void 0,
	onError: void 0,
	onRequest: void 0,
	onResponse: void 0
};
const defaultMiddlewareOptions = {
	rpcPreffix: void 0,
	path: void 0,
	headers: {},
	handler: void 0,
	onError: void 0,
	onRequest: void 0,
	onResponse: void 0
};

//#endregion
//#region src/cache.ts
var ServerCache = class {
	cache = /* @__PURE__ */ new Map();
	async get(key, ttl = defaultServerFnOptions.ttl, fetcher) {
		const entry = this.cache.get(key);
		const now = Date.now();
		if (entry?.promise) return entry.promise;
		if (entry?.data && now - entry.timestamp < ttl) return await entry.data;
		const promise = fetcher().then((data) => {
			this.cache.set(key, {
				data,
				timestamp: now
			});
			return data;
		});
		this.cache.set(key, {
			...entry,
			promise
		});
		return promise;
	}
	invalidate(pattern) {
		if (!pattern) {
			this.cache.clear();
			return;
		}
		for (const key of this.cache.keys()) if (typeof pattern === "string" && key.includes(pattern)) {
			this.cache.delete(key);
			break;
		} else if (pattern instanceof RegExp && pattern.test(key)) {
			this.cache.delete(key);
			break;
		} else if (pattern instanceof Array) {
			for (const p of pattern) if (typeof p === "string" && key.includes(p)) {
				this.cache.delete(key);
				break;
			} else if (p instanceof RegExp && p.test(key)) {
				this.cache.delete(key);
				break;
			}
		}
	}
};
const serverCache = new ServerCache();

//#endregion
//#region src/createFunction.ts
function createServerFunction(name, fn, fnOptions = {}) {
	const options = Object.assign({}, defaultServerFnOptions, fnOptions);
	const wrappedFunction = async (_signal, ...args) => {
		const cacheKey = `${name}:${JSON.stringify(args)}`;
		const result = await serverCache.get(cacheKey, options.ttl, async () => fn(...args));
		if (options.invalidateKeys) serverCache.invalidate(options.invalidateKeys);
		return result;
	};
	serverFunctionsMap.set(name, {
		name,
		fn: wrappedFunction,
		options
	});
	console.log(`✅ serverFunctionsMap now has:`, Array.from(serverFunctionsMap.entries()).map(([k, v]) => [k, v.options]));
	return wrappedFunction;
}

//#endregion
//#region src/getClientModules.ts
const getModule = (fnName, fnEntry, options) => {
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
		default: bodyHandling = `
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
const getClientModules = (initialOptions) => {
	console.log("getClientModules.functionMappings", functionMappings);
	return `

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
${Array.from(functionMappings.entries()).map(([registeredName, exportName]) => getModule(registeredName, exportName, {
		...initialOptions,
		...serverFunctionsMap.get(registeredName)?.options || {}
	})).join("\n")}
`.trim();
};

//#endregion
export { ServerCache, createServerFunction, defaultMiddlewareOptions, defaultRPCOptions, defaultServerFnOptions, functionMappings, getClientModules, scanForServerFiles, serverCache, serverFunctionsMap };
//# sourceMappingURL=server.mjs.map