import { createResource, type Resource } from "./resource";

export type AccessorWithLatest<T> = {
  (): T;
  latest: T;
};

// mock promise while hydrating to prevent fetching
class MockPromise {
  static all() {
    return new MockPromise();
  }
  static allSettled() {
    return new MockPromise();
  }
  static any() {
    return new MockPromise();
  }
  static race() {
    return new MockPromise();
  }
  static reject() {
    return new MockPromise();
  }
  static resolve() {
    return new MockPromise();
  }
  catch() {
    return new MockPromise();
  }
  then() {
    return new MockPromise();
  }
  finally() {
    return new MockPromise();
  }
}

function subFetch<T>(fn: (prev: T | undefined) => Promise<T>, prev: T | undefined) {
  // find a way to determine if isHydrating at the router level
  if (typeof window === undefined/* || !sharedConfig.context*/) return fn(prev);
  const ogFetch = fetch;
  const ogPromise = Promise;
  try {
    window.fetch = () => new MockPromise() as any;
    Promise = MockPromise as any;
    return fn(prev);
  } finally {
    window.fetch = ogFetch;
    Promise = ogPromise;
  }
}

export function createAsync<T>(
  fn: (prev: T | undefined) => Promise<T>,
  options?: {
    name?: string;
    initialValue?: T;
  },
): AccessorWithLatest<T | undefined> {
  let resource: Resource<T>;
  let prev = () =>
    !resource || resource.state === "unresolved" ? undefined : resource.latest;
  [resource] = createResource<T>(
    // () => fn(prev()),
    () => subFetch(fn, prev()),
    options,
  );

  const resultAccessor: AccessorWithLatest<T> = (() => resource()) as any;
  Object.defineProperty(resultAccessor, "latest", {
    get() {
      return resource.latest;
    },
  });

  return resultAccessor;
}
