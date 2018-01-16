import "zone.js";

import { TestResult } from "./test-result";
import { TestFunction } from "./test-function";
import { delay } from './util/timeout';
import { TestExecutionSettings } from "./test-execution-settings";
import { TestZone } from "./test-zone";

/**
 * Represents a unit test which can run itself.
 */
export class Test {
    public constructor(
        private _description : string, 
        private _function : TestFunction
    ) {
    }

    public get description() {
        return this._description;
    }

    public get function() {
        return this._function;
    }

    /**
     * Execute the test within a Zone.js "sandbox". 
     * @param executionSettings 
     */
    private executeInSandbox(executionSettings : TestExecutionSettings): Promise<void> {
        return new Promise((resolve, reject) => {
            let zone = new TestZone(`Test Zone: ${executionSettings.contextName}`);
            zone.onError.subscribe(e => reject(e));
            zone.onStable.subscribe(e => resolve());

            zone.invoke(async () => {
                try {
                    let testCompleted : any = this.function();
                    if (!testCompleted || !testCompleted.then)
                        testCompleted = Promise.resolve();
                    
                    await testCompleted;
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Run the test to produce a result, based on whether the test throws an exception 
     * or not.
     * 
     * @param executionSettings 
     */
    public async run(executionSettings : TestExecutionSettings, contextName : string): Promise<TestResult> {
        executionSettings = executionSettings.clone({ contextName });
        
        let timeOutToken = {};
        let timeout = delay(executionSettings.timeout || 10*1000, timeOutToken);

        try {
            // Execute the task, but limit our wait time to the 
            // configured timeout, and make sure we can tell if
            // we hit it.

            let timedOut = await Promise.race([
                timeout.completed, 
                this.executeInSandbox(executionSettings)
            ]);

            // If the operation timed out, report that.

            if (timedOut == timeOutToken)
                return new TestResult(this._description, false, "Timed out without completing");
        
            // Execution has completed successfully.
            
            return new TestResult(this._description, true);
            
        } catch (e) {
            // An exception was caught while handling the test.
            // Produce a result which indicates the error.

            if (e instanceof Error)
                e = `${e.message}: ${e.stack}`;

            return new TestResult(this._description, false, e.toString());
        } finally {
            timeout.cancel();
        }
    }
}
