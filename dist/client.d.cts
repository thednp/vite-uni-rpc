interface ActionOptions<T, U> {
    name?: string;
    onComplete?: (submission: ActionSubmission<T, U>) => void;
}
interface ActionSubmission<T, U> {
    input: T;
    result?: U;
    error?: Error;
    pending: boolean;
    clear: () => void;
    retry: () => Promise<U>;
}
declare function createAction<T, U = void>(fn: (input: T) => Promise<U>, options?: ActionOptions<T, U>): ((input: T) => Promise<U>) & {
    readonly latest: ActionSubmission<T, U> | undefined;
    readonly pending: boolean;
    readonly submissions: ActionSubmission<T, U>[];
    reset: () => void;
};

type AccessorWithLatest<T> = {
    (): T;
    latest: T;
};
declare function createAsync<T>(fn: (prev: T | undefined) => Promise<T>, options?: {
    name?: string;
    initialValue?: T;
}): AccessorWithLatest<T | undefined>;

interface ResourceOptions<T> {
    initialValue?: T;
}
type ResourceState<T> = {
    value: T | undefined;
    latest: T | undefined;
    loading: boolean;
    error: string | undefined;
    state: "unresolved" | "pending" | "ready" | "refreshing" | "errored";
};
type Resource<T> = (() => T) & ResourceState<T>;
declare function createResource<T>(fetcher: (() => T | undefined) | (() => Promise<T | Response>) | Promise<Response | T>, options?: ResourceOptions<T>): [Resource<T>, {
    cleanup: () => void;
    refetch: () => void;
    mutate: (value: T) => void;
}];

export { type AccessorWithLatest, type Resource, type ResourceOptions, type ResourceState, createAction, createAsync, createResource };
