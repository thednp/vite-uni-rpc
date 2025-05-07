// src/action.ts
import van from "vanjs-core";
import { reactive } from "vanjs-ext";
function createAction(fn, options = {}) {
  const state = reactive({
    submissions: []
  });
  async function actionFn(input) {
    let submission;
    let promiseHandlers = {
      resolve: void 0,
      reject: void 0
    };
    await new Promise((resolve, reject) => {
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
import { reactive as reactive2 } from "vanjs-ext";
var handleResponseErrors = (response) => {
  if (!response.ok) {
    const errorMessage = response.statusText.length ? response.statusText : `Fetch error: ${response.status}`;
    throw new Error(errorMessage);
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
        throw new Error(`Unrecognized JSON string value", ${er}`);
      }
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to parse result: ${error}`);
  }
};
function createResource(fetcher, options = {}) {
  const state = reactive2({
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
export {
  createAction,
  createAsync,
  createResource
};
