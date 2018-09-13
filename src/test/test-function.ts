import { fail } from "assert";

export interface DoneCallback {
    /**
     * Finish this test successfully.
     */
    () : void;

    /**
     * Finish this test as a failure
     */
    fail() : void;
}

export interface AsyncTestFunction {
    (done? : DoneCallback) : Promise<void>;
}

export interface SyncTestFunction {
    /**
     * @param done An optional callback to call when the test completes (or fails)
     */
    (done? : DoneCallback) : void;
}

export type TestFunction = AsyncTestFunction | SyncTestFunction;