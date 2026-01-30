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
//#region src/fastify/helpers.ts
const readBody = (req) => {
	return new Promise((resolve, reject) => {
		if ((req.headers["content-type"]?.toLowerCase() || "").includes("json")) {
			resolve({
				contentType: "application/json",
				data: req.body
			});
			return;
		}
		let body = "";
		req.raw.on("data", (chunk) => {
			body += chunk.toString();
		});
		req.raw.on("end", () => {
			resolve({
				contentType: "text/plain",
				data: body
			});
		});
		req.raw.on("error", reject);
	});
};

//#endregion
//#region src/fastify/createMiddleware.ts
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
	const middlewareHandler = async (req, reply, done) => {
		const url = new URL(req.url, "http://localhost").pathname;
		if (serverFunctionsMap.size === 0) await scanForServerFiles();
		if (!handler) {
			done();
			return;
		}
		try {
			if (onRequest) await onRequest(req);
			if (path) {
				if (!(typeof path === "string" ? new RegExp(path) : path).test(url || "")) {
					done();
					return;
				}
			}
			if (rpcPreffix && !url?.startsWith(`/${rpcPreffix}`)) {
				done();
				return;
			}
			if (headers) Object.entries(headers).forEach(([key, value]) => {
				reply.header(key, value);
			});
			if (handler) {
				await handler(req, reply, done);
				if (onResponse) await onResponse(reply);
				return;
			}
			done();
		} catch (error) {
			if (onResponse) await onResponse(reply);
			if (onError) await onError(error, req, reply);
			else {
				console.error("Middleware error:", String(error));
				reply.status(500).send({ error: "Internal Server Error" });
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
		handler: async (req, reply, done) => {
			const url = new URL(req.url, "http://localhost").pathname;
			const { rpcPreffix } = options;
			if (!url?.startsWith(`/${rpcPreffix}`)) {
				done();
				return;
			}
			const functionName = url.replace(`/${rpcPreffix}/`, "");
			const serverFunction = serverFunctionsMap.get(functionName);
			if (!serverFunction) {
				reply.status(404).send({ error: `Function "${functionName}" was not found` });
				return;
			}
			try {
				const body = await readBody(req);
				const controller = new AbortController();
				req.raw.on("close", () => controller.abort());
				req.raw.on("error", () => controller.abort());
				const args = Array.isArray(body.data) ? body.data : [body.data];
				const data = await serverFunction.fn(controller.signal, ...args);
				reply.status(200).send({ data });
			} catch (err) {
				console.error(String(err));
				reply.status(500).send({ error: "Internal Server Error" });
			}
		}
	});
};

//#endregion
export { createMiddleware, createRPCMiddleware, readBody };
//# sourceMappingURL=fastify.mjs.map