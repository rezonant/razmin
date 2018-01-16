
export interface AsyncTestFunction {
    () : Promise<void>;
}

export interface SyncTestFunction {
    () : void;
}

export type TestFunction = AsyncTestFunction | SyncTestFunction;