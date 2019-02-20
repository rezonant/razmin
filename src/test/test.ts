import "zone.js";
import * as colors from 'colors/safe';

import { TestResult } from "./test-result";
import { TestFunction, DoneCallback } from "./test-function";
import { delay, TestZone } from '../util';
import { TestExecutionSettings } from "../core";

/**
 * Whether to enable experimental Node.js promise rejection detection
 * using `process.on('unhandledRejection')`.
 */
const ENABLE_NODE_REJECTION_DETECTION = false;

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
            let executionCompleted = false;
            let isStable = false;
            let isResolved = false;

            zone.onError.subscribe(e => {
                if (isResolved) {
                    console.error(`Caught error after test completed, this is a bug.`);
                    console.error(`Error was:`);
                    console.error(e);
                    throw new Error(`Caught error after test completed, this is a bug.`);
                }

                reject(e);
            });
            zone.onStable.subscribe(e => {
                isStable = true;
                if (executionCompleted) {
                    isResolved = true;
                    resolve();
                }
            });

            zone.invoke(async () => {

                let unhandledRejectionHandler = (reason, promise) => {
                    if (Zone.current !== zone.zone) {
                        console.warn(`Skipping unrelated unhandled rejection from a different zone`);
                        return;
                    }
                    
                    console.log(`UNHANDLED REJECTION`);
                    console.dir(promise);
                    console.log(`REASON:`);
                    console.log(reason);
                };

                let uncaughtExceptionHandler = (err) => {
                    if (Zone.current !== zone.zone) {
                        console.warn(`Skipping unrelated uncaught exception from a different zone`);
                        return;
                    }
                    
                    console.log(`UNCAUGHT EXCEPTION:`);
                    console.error(err);
                };
                
                if (ENABLE_NODE_REJECTION_DETECTION && typeof process !== 'undefined') {
                    process.on('unhandledRejection', unhandledRejectionHandler);
                    process.on('uncaughtException', uncaughtExceptionHandler);
                }

                try {
                    let takesDone = this.function.length > 0;

                    if (takesDone) {
                        await new Promise(async (res, rej) => {
                            let done : DoneCallback = Object.assign(
                                () => res(), 
                                { fail: () => rej() }
                            );

                            try {
                                await this.function(done);
                            } catch (e) {
                                rej(e);
                            }
                        });
                    } else {
                        await this.function();
                    }

                    executionCompleted = true;
                    if (isStable) {
                        isResolved = true;
                        resolve();
                    }
                } catch (e) {
                    if (isResolved) {
                        console.error(`Caught error after test completed, this is a bug.`);
                        console.error(`Error was:`);
                        console.error(e);
                        throw new Error(`Caught error after test completed, this is a bug.`);
                    }
                    reject(e);
                }
                
                if (ENABLE_NODE_REJECTION_DETECTION typeof process !== 'undefined') {
                    process.removeListener('unhandledRejection', unhandledRejectionHandler);
                    process.removeListener('uncaughtException', uncaughtExceptionHandler);
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
    public async run(executionSettings? : TestExecutionSettings, contextName? : string): Promise<TestResult> {
        executionSettings = (executionSettings || new TestExecutionSettings()).clone({ contextName });
        
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
            
            return new TestResult(this._description, true, "Success");
            
        } catch (e) {
            // An exception was caught while handling the test.
            // Produce a result which indicates the error.

            let indent = '     ';
            let message = e.message ? e.message : e+"";
            let stackLine = null;
            let deepStackLines = [];
            
            if (e.stack) {
                let stack = e.stack+"";
                let parts = (stack || '').split(/\n/g);
                stackLine = (parts[1] || '').replace(/^ *at /, '');
                deepStackLines = 
                    (`           ${stack}`)
                    .replace(/^[^\n]*\n/, '')           // remove first line
                    .replace(/^ *at ?/gm, '')           // remove "at"
                    .replace(/\n/g, "\n          ")     // indent all lines
                    .split(/\n/g)
                    .slice(1)
                ;
            }

            let showStack = true;

            if (e.constructor.name == "AssertionError")
                showStack = false;

            return new TestResult(this._description, false, 
                `${indent}${colors.red('×')} ${message}\n` 
                + (stackLine? 
                    `       ${colors.gray('at')} ${colors.white(stackLine)}`
                    : '')
                + (showStack? 
                    `\n${colors.gray(deepStackLines.join("\n"))}`
                    : '')
            );
        } finally {
            timeout.cancel();
        }
    }
}
