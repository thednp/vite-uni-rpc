"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  createAction: () => createAction,
  createAsync: () => createAsync,
  createResource: () => createResource,
  createServerProxy: () => createServerProxy,
  isServerFunction: () => isServerFunction
});
module.exports = __toCommonJS(client_exports);

// src/action.ts
var import_vanjs_core = __toESM(require("vanjs-core"), 1);
var import_vanjs_ext = require("vanjs-ext");
function createAction(fn, options = {}) {
  const state = (0, import_vanjs_ext.reactive)({
    submissions: []
  });
  async function actionFn(input) {
    let submission;
    let promiseHandlers = {
      resolve: void 0,
      reject: void 0
    };
    const resultPromise = new Promise((resolve, reject) => {
      promiseHandlers = { resolve, reject };
    });
    submission = {
      input,
      pending: true,
      clear: () => {
        state.submissions = state.submissions.filter((s) => s !== submission);
      },
      retry: async () => {
        submission.pending = true;
        submission.error = void 0;
        submission.result = void 0;
        try {
          const result = await fn(input);
          submission.result = result;
          return result;
        } catch (error) {
          submission.error = error;
          throw error;
        } finally {
          submission.pending = false;
        }
      }
    };
    state.submissions = [...state.submissions, submission];
    try {
      const result = await fn(input);
      submission.result = result;
      submission.pending = false;
      options.onComplete?.(submission);
      promiseHandlers.resolve?.(result);
      return result;
    } catch (error) {
      submission.error = error;
      submission.pending = false;
      options.onComplete?.(submission);
      promiseHandlers.reject?.(error);
      throw error;
    }
  }
  const action = Object.assign(actionFn, {
    // Get latest submission
    get latest() {
      return state.submissions[state.submissions.length - 1];
    },
    // Check if any submission is pending
    get pending() {
      return state.submissions.some((s) => s.pending);
    },
    // Get all submissions
    get submissions() {
      return state.submissions;
    },
    // Clear all submissions
    reset: () => {
      state.submissions = [];
    }
  });
  return action;
}
var loginAction = createAction(
  async (input) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      throw new Error("Login failed");
    }
    return response.json();
  },
  {
    name: "login",
    onComplete: (submission) => {
      if (submission.result) {
        localStorage.setItem("token", submission.result.token);
      }
    }
  }
);

// src/resource.ts
var import_vanjs_ext2 = require("vanjs-ext");
var handleResponseErrors = (response) => {
  if (!response.ok) {
    const errorMessage = response.statusText.length ? response.statusText : `Fetch error: ${response.status}`;
    throw new Error(errorMessage, { cause: response.status });
  }
  return response.clone();
};
var parseResult = async (initialResult) => {
  const result = handleResponseErrors(
    initialResult instanceof Promise ? await initialResult : initialResult
  );
  try {
    if (result instanceof Response) {
      const contentType = result.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return result.json();
      } else if (contentType?.includes("text/")) {
        return result.text();
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        const formData = await result.formData();
        return Object.fromEntries(formData);
      } else if (contentType?.includes("multipart/form-data")) {
        const formData = await result.formData();
        const formObject = {};
        formData.forEach((value, key) => {
          if (key in formObject) {
            if (Array.isArray(formObject[key])) {
              formObject[key].push(value);
            } else {
              formObject[key] = [formObject[key], value];
            }
          } else {
            formObject[key] = value;
          }
        });
        return formObject;
      } else if (contentType?.includes("application/octet-stream")) {
        return result.arrayBuffer();
      } else if (contentType?.includes("image/") || contentType?.includes("video/") || contentType?.includes("audio/")) {
        return result.blob();
      }
    } else if (result instanceof ReadableStream) {
      const reader = result.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const blob = new Blob(chunks);
      const text = await blob.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } else if (result instanceof Blob) {
      return result.text().then((text) => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      });
    } else if (result instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(result);
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } else if (result instanceof FormData) {
      return Object.fromEntries(result);
    } else if (typeof result === "string") {
      try {
        return JSON.parse(result);
      } catch (er) {
        throw new Error("Unrecognized JSON string value", er);
      }
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to parse result: ${error?.message || error}`);
  }
};
function createResource(fetcher, options = {}) {
  const state = (0, import_vanjs_ext2.reactive)({
    value: options.initialValue,
    latest: options.initialValue,
    loading: false,
    error: void 0,
    state: options.initialValue !== void 0 ? "ready" : "unresolved"
  });
  let currentController = null;
  const load = async () => {
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    currentController = new AbortController();
    const { signal } = currentController;
    state.loading = true;
    state.error = void 0;
    state.state = state.value ? "refreshing" : "pending";
    try {
      const initialResult = await (async () => {
        const result = await (fetcher instanceof Promise ? fetcher : fetcher());
        if (signal.aborted) throw new Error("Aborted");
        return result;
      })();
      if (signal.aborted) return;
      const parsedResult = await parseResult(initialResult);
      state.value = parsedResult;
      state.state = "ready";
    } catch (err) {
      if (signal.aborted) return;
      console.log("typeof err", typeof err);
      console.log(err);
      if (err && typeof err === "object" && "message" in err) {
        state.error = err.message;
      } else if (typeof err === "string") {
        state.error = err;
      } else {
        state.error = "Fetch Error";
      }
      state.state = "errored";
    } finally {
      if (!signal.aborted) {
        state.loading = false;
      }
    }
  };
  const actions = {
    cleanup: () => {
      if (currentController) {
        currentController.abort();
        currentController = null;
      }
    },
    refetch: () => queueMicrotask(load),
    mutate: (value) => {
      state.value = value;
      state.error = void 0;
    }
  };
  const resource = () => state.value;
  Object.defineProperties(resource, {
    loading: { get: () => state.loading },
    error: { get: () => state.error },
    value: { get: () => state.value },
    latest: {
      get: () => {
        if (state.error && !state.loading) return void 0;
        return state.value;
      }
    }
  });
  actions.refetch();
  return [resource, actions];
}

// src/async.ts
var MockPromise = class _MockPromise {
  static all() {
    return new _MockPromise();
  }
  static allSettled() {
    return new _MockPromise();
  }
  static any() {
    return new _MockPromise();
  }
  static race() {
    return new _MockPromise();
  }
  static reject() {
    return new _MockPromise();
  }
  static resolve() {
    return new _MockPromise();
  }
  catch() {
    return new _MockPromise();
  }
  then() {
    return new _MockPromise();
  }
  finally() {
    return new _MockPromise();
  }
};
function subFetch(fn, prev) {
  if (typeof window === void 0) return fn(prev);
  const ogFetch = fetch;
  const ogPromise = Promise;
  try {
    window.fetch = () => new MockPromise();
    Promise = MockPromise;
    return fn(prev);
  } finally {
    window.fetch = ogFetch;
    Promise = ogPromise;
  }
}
function createAsync(fn, options) {
  let resource;
  let prev = () => !resource || resource.state === "unresolved" ? void 0 : resource.latest;
  [resource] = createResource(
    // () => fn(prev()),
    () => subFetch(fn, prev()),
    options
  );
  const resultAccessor = () => resource();
  Object.defineProperty(resultAccessor, "latest", {
    get() {
      return resource.latest;
    }
  });
  return resultAccessor;
}

// src/client.ts
async function createServerProxy(name, fn) {
  const proxyFn = async (...args) => {
    try {
      const response = await fetch("/__rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          args
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    } catch (error) {
      console.error("RPC call failed:", error);
      throw error;
    }
  };
  proxyFn.__fn__ = fn;
  return proxyFn;
}
function isServerFunction(fn) {
  return typeof fn === "function" && "__fn__" in fn;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createAction,
  createAsync,
  createResource,
  createServerProxy,
  isServerFunction
});
