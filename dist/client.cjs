"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('./chunk-ETV4XYOV.cjs');

// src/action.ts
var _vanjscore = require('vanjs-core'); var _vanjscore2 = _interopRequireDefault(_vanjscore);
var _vanjsext = require('vanjs-ext');
function createAction(fn, options = {}) {
  const state = _vanjsext.reactive.call(void 0, {
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
      _optionalChain([options, 'access', _ => _.onComplete, 'optionalCall', _2 => _2(submission)]);
      _optionalChain([promiseHandlers, 'access', _3 => _3.resolve, 'optionalCall', _4 => _4(result)]);
      return result;
    } catch (error) {
      submission.error = error;
      submission.pending = false;
      _optionalChain([options, 'access', _5 => _5.onComplete, 'optionalCall', _6 => _6(submission)]);
      _optionalChain([promiseHandlers, 'access', _7 => _7.reject, 'optionalCall', _8 => _8(error)]);
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
      if (_optionalChain([contentType, 'optionalAccess', _9 => _9.includes, 'call', _10 => _10("application/json")])) {
        return result.json();
      } else if (_optionalChain([contentType, 'optionalAccess', _11 => _11.includes, 'call', _12 => _12("text/")])) {
        return result.text();
      } else if (_optionalChain([contentType, 'optionalAccess', _13 => _13.includes, 'call', _14 => _14("application/x-www-form-urlencoded")])) {
        const formData = await result.formData();
        return Object.fromEntries(formData);
      } else if (_optionalChain([contentType, 'optionalAccess', _15 => _15.includes, 'call', _16 => _16("multipart/form-data")])) {
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
      } else if (_optionalChain([contentType, 'optionalAccess', _17 => _17.includes, 'call', _18 => _18("application/octet-stream")])) {
        return result.arrayBuffer();
      } else if (_optionalChain([contentType, 'optionalAccess', _19 => _19.includes, 'call', _20 => _20("image/")]) || _optionalChain([contentType, 'optionalAccess', _21 => _21.includes, 'call', _22 => _22("video/")]) || _optionalChain([contentType, 'optionalAccess', _23 => _23.includes, 'call', _24 => _24("audio/")])) {
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
      } catch (e) {
        return text;
      }
    } else if (result instanceof Blob) {
      return result.text().then((text) => {
        try {
          return JSON.parse(text);
        } catch (e2) {
          return text;
        }
      });
    } else if (result instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(result);
      try {
        return JSON.parse(text);
      } catch (e3) {
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
  const state = _vanjsext.reactive.call(void 0, {
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




exports.createAction = createAction; exports.createAsync = createAsync; exports.createResource = createResource;
