import { loadConfigFromFile, mergeConfig, transformWithEsbuild } from "vite";
import colors from "picocolors";
import { resolve } from "node:path";
import process from "node:process";
import { existsSync } from "node:fs";
import { getClientModules, scanForServerFiles, serverFunctionsMap } from "vite-uni-rpc/server";

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
//#region src/express/helpers.ts
const readBody = (req, signal) => {
	return new Promise((resolve, reject) => {
		let body = "";
		if (signal?.aborted) {
			reject("Request aborted");
			return;
		}
		const onAbort = () => {
			reject("Request aborted");
			req.removeListener("data", onData);
			req.removeListener("end", onEnd);
			req.removeListener("error", onError);
		};
		if (signal) signal.addEventListener("abort", onAbort);
		const onData = (chunk) => {
			body += chunk.toString();
		};
		const onEnd = () => {
			if (signal) signal.removeEventListener("abort", onAbort);
			try {
				resolve({
					contentType: "application/json",
					data: JSON.parse(body)
				});
			} catch (_e) {
				resolve({
					contentType: "text/plain",
					data: body
				});
			}
		};
		const onError = (err) => {
			if (signal) signal.removeEventListener("abort", onAbort);
			reject(err);
		};
		req.on("data", onData);
		req.on("end", onEnd);
		req.on("error", onError);
	});
};
const isExpressRequest = (req) => {
	return "originalUrl" in req;
};
const isExpressResponse = (res) => {
	return "json" in res && "send" in res;
};
const getRequestDetails = (request) => {
	const rawUrl = isExpressRequest(request) ? request.originalUrl : request.url;
	const url = new URL(rawUrl, "http://localhost");
	return {
		url: url.pathname,
		search: url.search,
		searchParams: url.searchParams,
		headers: request.headers,
		method: request.method
	};
};
const getResponseDetails = (response) => {
	const isResponseSent = response.headersSent || response.writableEnded;
	const setHeader = (name, value) => {
		if (isExpressResponse(response)) response.header(name, value);
		else response.setHeader(name, value);
	};
	const setStatusCode = (code) => {
		if (isExpressResponse(response)) response.status(code);
		else response.statusCode = code;
	};
	const sendResponse = (code, output) => {
		setStatusCode(code);
		if (isExpressResponse(response)) response.send(JSON.stringify(output));
		else response.end(JSON.stringify(output));
	};
	return {
		isResponseSent,
		setHeader,
		statusCode: response.statusCode,
		setStatusCode,
		sendResponse
	};
};

//#endregion
//#region src/express/createMiddleware.ts
let middlewareCount = 0;
const middleWareStack = /* @__PURE__ */ new Set();
const createMiddleware = (initialOptions = {}) => {
	const { name: middlewareName, rpcPreffix, path, headers, handler, onRequest, onResponse, onError } = Object.assign({}, defaultMiddlewareOptions, initialOptions);
	let name = middlewareName;
	if (!name) {
		name = "viteRPCMiddleware-" + middlewareCount;
		middlewareCount += 1;
	}
	if (middleWareStack.has(name)) throw new Error(`The middleware name "${name}" is already used.`);
	const middlewareHandler = async (req, res, next) => {
		const { url } = getRequestDetails(req);
		const { sendResponse, setHeader } = getResponseDetails(res);
		if (!handler) return next?.();
		try {
			if (onRequest) await onRequest(req);
			if (path) {
				if (!(typeof path === "string" ? new RegExp(path) : path).test(url || "")) return next?.();
			}
			if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) return next?.();
			if (headers) Object.entries(headers).forEach(([key, value]) => {
				setHeader(key, value);
			});
			if (handler) {
				await handler(req, res, next);
				if (onResponse) await onResponse(res);
				return;
			}
			next?.();
		} catch (error) {
			if (onResponse) await onResponse(res);
			if (onError) onError(error, req, res);
			else {
				console.error("Middleware error:", String(error));
				sendResponse(500, { error: "Internal Server Error" });
			}
		}
	};
	Object.defineProperty(middlewareHandler, "name", { value: name });
	return middlewareHandler;
};
const createRPCMiddleware = (initialOptions = {}) => {
	const options = Object.assign({}, defaultMiddlewareOptions, { rpcPreffix: defaultRPCOptions.rpcPreffix }, initialOptions);
	return createMiddleware({
		...options,
		handler: async (req, res, next) => {
			const { url } = getRequestDetails(req);
			const { sendResponse } = getResponseDetails(res);
			const { rpcPreffix } = options;
			if (!url?.startsWith(`/${rpcPreffix}`)) return next?.();
			const functionName = url.replace(`/${rpcPreffix}/`, "");
			const serverFunction = serverFunctionsMap.get(functionName);
			if (!serverFunction) {
				sendResponse(404, { error: `Function "${functionName}" not found` });
				return;
			}
			try {
				const controller = new AbortController();
				req.addListener("close", (e) => {
					console.log("Operation Aborted", e);
					controller.abort("Operation Aborted");
				});
				req.addListener("error", (e) => {
					console.log("Request Error", e);
				});
				const body = await readBody(req, controller.signal);
				const args = Array.isArray(body.data) ? body.data : [body.data];
				const result = await serverFunction.fn(controller.signal, ...args);
				console.log("express.middleware", result);
				if (!res.headersSent) sendResponse(200, { data: result });
			} catch (err) {
				console.error(String(err));
				sendResponse(500, { error: "Internal Server Error" });
			}
		}
	});
};

//#endregion
//#region src/index.ts
/**
* Utility to define `vite-uni-rpc` configuration file similar to vite.
* @param uniConfig a system wide RPC configuration
*/
const defineConfig = (uniConfig) => {
	return mergeConfig(defaultRPCOptions, uniConfig);
};
let RPCConfig;
/**
* Utility to load `vite-uni-rpc` configuration file system wide.
* @param configFile an optional parameter to specify a file within your project scope
*/
async function loadRPCConfig(configFile) {
	try {
		const env = {
			command: "serve",
			root: process.cwd(),
			mode: process.env.NODE_ENV || "development"
		};
		const defaultConfigFiles = [
			"rpc.config.ts",
			"rpc.config.js",
			"rpc.config.mjs",
			"rpc.config.mts",
			".rpcrc.ts",
			".rpcrc.js"
		];
		if (configFile) {
			const configFilePath = resolve(env.root, configFile);
			if (!existsSync(configFilePath)) {
				console.warn(`  ${colors.redBright("⚠︎")} The specified RPC config file ${colors.redBright(colors.bold(configFile))} cannot be found, loading the defaults..`);
				RPCConfig = defaultRPCOptions;
				return defaultRPCOptions;
			}
			const result = await loadConfigFromFile(env, configFile);
			if (result) {
				console.log(`  ${colors.yellow("⚡︎")} Succesfully loaded your ${colors.green(colors.bold(configFile))} file!`);
				RPCConfig = mergeConfig({
					...defaultRPCOptions,
					configFile: configFilePath
				}, result.config);
				return RPCConfig;
			}
			RPCConfig = defaultRPCOptions;
			return RPCConfig;
		}
		if (RPCConfig !== void 0) return RPCConfig;
		for (const file of defaultConfigFiles) {
			const configFilePath = resolve(env.root, file);
			if (!existsSync(configFilePath)) continue;
			const result = await loadConfigFromFile(env, file);
			if (result) {
				RPCConfig = mergeConfig({
					...defaultRPCOptions,
					configFile: configFilePath
				}, result.config);
				console.log(`  ${colors.yellow("⚡︎")} Succesfully loaded ${colors.green(colors.bold(file))} file`);
				return RPCConfig;
			}
		}
		console.warn(`  ${colors.yellow("⚡︎")} No RPC config found, loading the defaults..`);
		return defaultRPCOptions;
	} catch (error) {
		console.warn(`  ${colors.redBright("⚠︎")} Failed to load RPC config:`, error);
		return defaultRPCOptions;
	}
}
function rpcPlugin(devOptions = {}) {
	let options;
	let config;
	let viteServer;
	return {
		name: "vite-uni-rpc",
		enforce: "pre",
		async configResolved(resolvedConfig) {
			options = mergeConfig(await loadRPCConfig(), devOptions);
			config = resolvedConfig;
		},
		async configureServer(server) {
			viteServer = server;
			const { adapter: _adapter, ...rest } = options;
			if (serverFunctionsMap.size === 0) await scanForServerFiles(config, viteServer);
			server.middlewares.use(createRPCMiddleware(rest));
		},
		async buildStart() {
			if (!viteServer && config) await scanForServerFiles(config);
		},
		async transform(code, id, ops) {
			if (!code.includes("createServerFunction") || ops?.ssr || code.includes("createServerFunction") && typeof process === "undefined") return null;
			if (serverFunctionsMap.size === 0) await scanForServerFiles(config);
			console.log("before transformWithEsbuild(getClientModules(options))", serverFunctionsMap);
			return {
				code: (await transformWithEsbuild(getClientModules(options), id, {
					loader: "js",
					target: "es2020"
				})).code,
				map: null
			};
		}
	};
}

//#endregion
export { rpcPlugin as default, defineConfig, loadRPCConfig };
//# sourceMappingURL=index.mjs.map