import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

//#region src/utils.ts
const serverFunctionsMap = /* @__PURE__ */ new Map();
const functionMappings = /* @__PURE__ */ new Map();
const scanForServerFiles = async (initialCfg, devServer) => {
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
	if (!server) {
		const { createServer } = await import("vite");
		server = await createServer({
			server: config.server,
			appType: "custom",
			base: config.base,
			root: config.root
		});
	}
	const svFiles = [
		"server.ts",
		"server.js",
		"server.mjs",
		"server.mts"
	];
	const apiDir = join(config.root, "src", "api");
	const files = (await readdir(apiDir, { withFileTypes: true })).filter((f) => svFiles.some((fn) => f.name.includes(fn))).map((f) => join(apiDir, f.name));
	for (const file of files) try {
		const moduleExports = await server.ssrLoadModule(file);
		const moduleEntries = Object.entries(moduleExports);
		if (!moduleEntries.length) {
			console.warn("No server function found.");
			if (!devServer) server.close();
			return;
		}
		for (const [exportName, exportValue] of moduleEntries) for (const [registeredName, serverFn] of serverFunctionsMap.entries()) if (serverFn.name === registeredName && serverFn.fn === exportValue) functionMappings.set(registeredName, exportName);
		if (!devServer) server.close();
	} catch (error) {
		console.error("Error loading file:", file, error);
	}
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
//#region src/express/helpers.ts
const readBody = (req) => {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk.toString();
		});
		req.on("end", () => {
			try {
				resolve({
					contentType: "application/json",
					data: JSON.parse(body)
				});
			} catch (_e) {
				reject(/* @__PURE__ */ new Error("Invalid JSON"));
			}
			resolve({
				contentType: "text/plain",
				data: body
			});
		});
		req.on("error", reject);
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
	const { name: middlewareName, rpcPreffix, path, headers, handler, onRequest, onResponse, onError } = {
		...defaultMiddlewareOptions,
		...initialOptions
	};
	let name = middlewareName;
	if (!name) {
		name = "viteRPCMiddleware-" + middlewareCount;
		middlewareCount += 1;
	}
	if (middleWareStack.has(name)) throw new Error(`The middleware name "${name}" is already used.`);
	const middlewareHandler = async (req, res, next) => {
		const { url } = getRequestDetails(req);
		const { sendResponse, setHeader } = getResponseDetails(res);
		if (serverFunctionsMap.size === 0) await scanForServerFiles();
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
	const options = {
		...defaultMiddlewareOptions,
		rpcPreffix: defaultRPCOptions.rpcPreffix,
		...initialOptions
	};
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
				const body = await readBody(req);
				const args = Array.isArray(body.data) ? body.data : [body.data];
				sendResponse(200, { data: await serverFunction.fn(...args) });
			} catch (err) {
				console.error(String(err));
				sendResponse(500, { error: "Internal Server Error" });
			}
		}
	});
};

//#endregion
export { createMiddleware, createRPCMiddleware, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, readBody };
//# sourceMappingURL=express.mjs.map