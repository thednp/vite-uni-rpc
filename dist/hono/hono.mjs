import { createMiddleware as createMiddleware$1 } from "hono/factory";
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
//#region src/hono/helpers.ts
/**
* Creates a hono compatible middleware for a given vite development server.
* @see https://github.com/honojs/hono/issues/3162#issuecomment-2331118049
* @param vite the vite development server
*/
const viteMiddleware = (vite) => {
	return createMiddleware$1((c, next) => {
		return new Promise((resolve) => {
			if (typeof Bun === "undefined") {
				vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve(next()));
				return;
			}
			let sent = false;
			const headers = new Headers();
			vite.middlewares({
				url: new URL(c.req.path, "http://localhost").pathname,
				method: c.req.raw.method,
				headers: Object.fromEntries(c.req.raw.headers)
			}, {
				setHeader(name, value) {
					headers.set(name, value);
					return this;
				},
				end(body) {
					sent = true;
					resolve(c.body(body, c.res.status, headers));
				}
			}, () => sent || resolve(next()));
		});
	});
};
const readBody = async (c) => {
	if ((c.req.header("content-type")?.toLowerCase() || "").includes("json")) return {
		contentType: "application/json",
		data: await c.req.json()
	};
	return {
		contentType: "text/plain",
		data: await c.req.text()
	};
};

//#endregion
//#region src/hono/createMiddleware.ts
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
	const middlewareHandler = createMiddleware$1(async (c, next) => {
		const url = new URL(c.req.path, "http://localhost").pathname;
		if (serverFunctionsMap.size === 0) await scanForServerFiles();
		if (!handler) {
			await next();
			return;
		}
		try {
			if (onRequest) await onRequest(c);
			if (path) {
				if (!(typeof path === "string" ? new RegExp(path) : path).test(url || "")) {
					await next();
					return;
				}
			}
			if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
				await next();
				return;
			}
			if (headers) Object.entries(headers).forEach(([key, value]) => {
				c.header(key, value);
			});
			if (handler) {
				const result = await handler(c, next);
				if (onResponse) await onResponse(c);
				return result;
			}
			await next();
		} catch (error) {
			if (onResponse) await onResponse(c);
			if (onError) await onError(error, c);
			else return c.json({ error: "Internal Server Error" }, 500);
		}
	});
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
		handler: async (c, next) => {
			const { path } = c.req;
			const { rpcPreffix } = options;
			if (!rpcPreffix || !path.startsWith(`/${rpcPreffix}`)) {
				await next();
				return;
			}
			const functionName = path.replace(`/${rpcPreffix}/`, "");
			const serverFunction = serverFunctionsMap.get(functionName);
			if (!serverFunction) return c.json({ error: `Function "${functionName}" not found` }, 404);
			try {
				const body = await readBody(c);
				const args = Array.isArray(body.data) ? body.data : [body.data];
				const result = await serverFunction.fn(void 0, ...args);
				return c.json({ data: result }, 200);
			} catch (err) {
				console.error(String(err));
				return c.json({ error: "Internal Server Error" }, 500);
			}
		}
	});
};

//#endregion
export { createMiddleware, createRPCMiddleware, readBody, viteMiddleware };
//# sourceMappingURL=hono.mjs.map