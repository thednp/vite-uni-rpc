import { reactive } from "vanjs-ext";

export interface ResourceOptions<T> {
  initialValue?: T;
}

export type ResourceState<T> = {
  value: T | undefined;
  latest: T | undefined;
  loading: boolean;
  error: string | undefined;
  state: "unresolved" | "pending" | "ready" | "refreshing" | "errored";
};

export type Resource<T> = (() => T) & ResourceState<T>;

const handleResponseErrors = (response: Response) => {
  // console.log("handleResponseErrors.response", response);
  if (!response.ok) {
    const errorMessage = response.statusText.length
      ? response.statusText
      : `Fetch error: ${response.status}`;
    throw new Error(errorMessage, { cause: response.status });
  }
  return response.clone();
};

const parseResult = async <T>(initialResult: unknown): Promise<T> => {
  const result = handleResponseErrors(
    initialResult instanceof Promise
      ? await initialResult
      : initialResult
  ) as unknown;

  try {
    if (result instanceof Response) {
      // Handle different content types
      const contentType = result.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return result.json();
      } else if (contentType?.includes("text/")) {
        return result.text() as Promise<T>;
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await result.formData();
        return Object.fromEntries(formData) as T;
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await result.formData();
        // Convert FormData to a more usable object structure
        const formObject: Record<string, string | File | Array<string | File>> = {};
        
        formData.forEach((value, key) => {
          // If the key already exists, convert to array
          if (key in formObject) {
            if (Array.isArray(formObject[key])) {
              (formObject[key] as Array<string | File>).push(value as string | File);
            } else {
              formObject[key] = [formObject[key] as string | File, value as string | File];
            }
          } else {
            formObject[key] = value;
          }
        });
        
        return formObject as T;
      } else if (contentType?.includes("application/octet-stream")) {
        return result.arrayBuffer() as Promise<T>;
      } else if (
        contentType?.includes("image/") || contentType?.includes("video/") ||
        contentType?.includes("audio/")
      ) {
        return result.blob() as Promise<T>;
      }
    } else if (result instanceof ReadableStream) {
      // Handle streaming data
      const reader = result.getReader();
      const chunks: Uint8Array[] = [];

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
        return text as T;
      }
    } else if (result instanceof Blob) {
      return result.text().then((text) => {
        try {
          return JSON.parse(text);
        } catch {
          return text as T;
        }
      });
    } else if (result instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(result);
      try {
        return JSON.parse(text);
      } catch {
        return text as T;
      }
    } else if (result instanceof FormData) {
        return Object.fromEntries(result) as T;
    } else if (typeof result === "string") {
      try {
        return JSON.parse(result);
      } catch (er) {
        // return result as T;
        throw new Error("Unrecognized JSON string value", er);
      }
    }

    return result as T;
  } catch (error) {
    throw new Error(`Failed to parse result: ${error?.message || error}`);
    // throw error;
  }
};

export function createResource<T>(
  fetcher:
    | (() => T | undefined)
    | (() => Promise<T | Response>)
    | Promise<Response | T>,
  options: ResourceOptions<T> = {},
) {
  const state = reactive<ResourceState<T>>({
    value: options.initialValue,
    latest: options.initialValue,
    loading: false,
    error: undefined,
    state: options.initialValue !== undefined ? "ready" : "unresolved",
  });
  let currentController: AbortController | null = null;

  const load = async () => {
    // Abort previous request if it exists
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    // Create new controller for this request
    currentController = new AbortController();
    const { signal } = currentController;

    state.loading = true;
    state.error = undefined;
    state.state = state.value ? "refreshing" : "pending";

    try {
      // Pass the signal to fetch operations
      const initialResult = await ((async () => {
        // If fetcher is a Promise or a function that returns a Promise
        const result = await (fetcher instanceof Promise ? fetcher : fetcher());
        // If it's a fetch call, we need to check if it was aborted
        if (signal.aborted) throw new Error("Aborted");
        return result;
      })());

      // Check if request was aborted before parsing
      if (signal.aborted) return;

      const parsedResult = await parseResult<T>(initialResult);
      state.value = parsedResult;
      state.state = "ready";
    } catch (err: unknown) {
      // Don't update error state if request was aborted
      if (signal.aborted) return;

      console.log("typeof err", typeof err);
      console.log((err as Error));
      if (err && typeof err === "object" && "message" in err) {
        state.error = err.message as string;
      } else if (typeof err === 'string') {
        state.error = err;
      } else {
        state.error = "Fetch Error";
      }
      state.state = "errored";
    } finally {
      // Only update loading state if request wasn't aborted
      if (!signal.aborted) {
        state.loading = false;
      }
    }
  };

  // Attach actions
  const actions = {
    cleanup: () => {
      if (currentController) {
        currentController.abort();
        currentController = null;
      }
    },
    refetch: () => queueMicrotask(load),
    mutate: (value: T) => {
      state.value = value;
      state.error = undefined;
    },
  };

  // Create resource function that returns current value
  const resource = () => state.value;

  // Attach state properties
  Object.defineProperties(resource, {
    loading: { get: () => state.loading },
    error: { get: () => state.error },
    value: { get: () => state.value },
    latest: {
      get: () => {
        // don't throw here, allow renderer to use state.error;
        if (state.error && !state.loading) return undefined;
        return state.value;
      },
    },
  });

  // Initial load
  actions.refetch();

  return [resource, actions] as [Resource<T>, typeof actions];
}
