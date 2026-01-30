import { createMiddleware as createMiddleware$1 } from "hono/factory";
import { scanForServerFiles, serverFunctionsMap } from "vite-uni-rpc/server";

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
	const { name: middlewareName, rpcPreffix, path, headers, handler, onRequest, onResponse, onError } = Object.assign({}, defaultMiddlewareOptions, initialOptions);
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
	const options = Object.assign({}, defaultMiddlewareOptions, { rpcPreffix: defaultRPCOptions.rpcPreffix }, initialOptions);
	return createMiddleware({
		...options,
		handler: async (c, next) => {
			const { path } = c.req;
			const { rpcPreffix } = options;
			if (!rpcPreffix || !path.startsWith(`/${rpcPreffix}`)) return await next();
			const functionName = path.replace(`/${rpcPreffix}/`, "");
			const serverFunction = serverFunctionsMap.get(functionName);
			if (!serverFunction) return c.json({ error: `Function "${functionName}" not found` }, 404);
			try {
				const body = await readBody(c);
				const controller = new AbortController();
				c.req.raw.signal.addEventListener("abort", () => {
					controller.abort();
				});
				const args = Array.isArray(body.data) ? body.data : [body.data];
				const result = await serverFunction.fn(controller.signal, ...args);
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