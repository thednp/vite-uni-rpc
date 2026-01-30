import { serverFunctionsMap } from "vite-uni-rpc/server";

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
export { createMiddleware, createRPCMiddleware, getRequestDetails, getResponseDetails, isExpressRequest, isExpressResponse, readBody };
//# sourceMappingURL=express.mjs.map