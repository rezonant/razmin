import "zone.js";
import * as colors from 'colors/safe';

import { TestResult } from "./test-result";
import { TestFunction, DoneCallback, TestOptions } from "./test-function";
import { delay, TestZone } from '../util';
import { TestExecutionSettings } from "../core";

export class Skip {}

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
        private _function : TestFunction,
        private _options : TestOptions = {}
    ) {
    }

    public get description() {
        return this._description;
    }

    public get function() {
        return this._function;
    }

    public get options() {
        return this._options || {};
    }

    /**
     * Execute the test within a Zone.js "sandbox". 
     * @param executionSettings 
     */
    private executeInSandbox(executionSettings : TestExecutionSettings): Promise<void> {
        return new Promise((resolve, reject) => {
            let zone = new TestZone(`Test Zone: ${executionSettings.contextName}`, {
                razminTest: this
            });
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

            if (executionSettings.verbose)
                console.log(`Running test: ${executionSettings.contextName}`);
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
                
                if (ENABLE_NODE_REJECTION_DETECTION && typeof process !== 'undefined') {
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

        if (this.options.skip)
            return new TestResult({ description: this._description, passed: 'skip', message: "Skipped" });

        executionSettings = (executionSettings || new TestExecutionSettings()).clone({ contextName });
        
        let timeOutToken = {};
        let timeout = delay(executionSettings.timeout || 10*1000, timeOutToken);
        let startedAt = Date.now();
        let finishedAt = undefined;
        let duration = undefined;

        try {
            // Execute the task, but limit our wait time to the 
            // configured timeout, and make sure we can tell if
            // we hit it.

            let result;

            try {
                result = await Promise.race([
                    timeout, 
                    this.executeInSandbox(executionSettings)
                ]);
            } finally {
                finishedAt = Date.now();
                duration = finishedAt - startedAt;
            }

            // If the operation timed out, report that.

            if (result === timeOutToken) {
                return new TestResult({
                    description: this._description, 
                    passed: false, 
                    message: `Timed out (${executionSettings.timeout}ms) without completing`, 
                    duration
                });
            }
        
            // Execution has completed successfully.
            
            return new TestResult({
                description: this._description, 
                passed: true, 
                message: "Success", 
                duration
            });
            
        } catch (e) {
            // An exception was caught while handling the test.
            // Produce a result which indicates the error.

            if (e instanceof Skip)
                return new TestResult({ description: this._description, passed: 'skip', message: 'Skipped' });

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

            return new TestResult({
                description: this._description, 
                passed: false, 
                message: `${indent}${colors.red('×')} ${message}\n` 
                    + (stackLine? 
                        `       ${colors.gray('at')} ${colors.white(stackLine)}`
                        : '')
                    + (showStack? 
                        `\n${colors.gray(deepStackLines.join("\n"))}`
                        : ''), 
                duration
            });
        } finally {
            timeout.cancel();
        }
    }
}
