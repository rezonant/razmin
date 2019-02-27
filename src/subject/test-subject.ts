import { Test, TestOptions } from "../test";
import { TestFunction } from "../test";
import { TestSubjectResult } from "../subject";
import { TestResult } from "../test";
import { TestExecutionSettings } from "../core";
import { LifecycleContainer, descriptionConcat } from "../util";

import MersenneTwister = require('mersenne-twister');
import { Reporter } from "../reporting";

/**
 * Represents a set of unit tests built around a single object under test ("subject")
 */
export class TestSubject implements LifecycleContainer {
    public constructor(
        private _description : string,
        private _parent? : LifecycleContainer
    ) {

    }

    private _tests : Test[] = [];
    private _lifecycleEvents : any = {};

    public addEventListener(eventName : string, handler : Function) {
        if (!this._lifecycleEvents[eventName])
            this._lifecycleEvents[eventName] = [];

        this._lifecycleEvents[eventName].push(handler);
    }

    public async fireEvent(eventName : string) {
        if (this._parent)
            this._parent.fireEvent(eventName);
        let handlers : Function[] = this._lifecycleEvents[eventName] || [];
        for (let handler of handlers)
            await handler();
    }

    /**
     * Get the human-readable description of this subject.
     */
    public get description() {
        return this._description;
    }
    
    /**
     * Get the set of defined tests for this subject.
     */
    public get tests() {
        return this._tests;
    }

    /**
     * Add a test which pertains to this test subject
     * @param description 
     * @param func 
     */
    public addTest(description : string, func : TestFunction, options? : TestOptions) {
        this._tests.push(new Test(description, func, options));
    }

    /**
     * Run an individual test with the given execution settings and an appropriate 
     * context name.
     * 
     * @param test 
     * @param testExecutionSettings 
     */
    private runTest(test : Test, testExecutionSettings : TestExecutionSettings) {
        return test.run(testExecutionSettings, `${descriptionConcat(this._description, test.description)}`);
    }

    /**
     * Run all tests that deal with this test subject.
     * @param testExecutionSettings 
     */
    public async run(reporters? : Reporter[], testExecutionSettings? : TestExecutionSettings): Promise<TestSubjectResult> {
        let results : TestResult[] = [];
        let tests : Test[] = this._tests;
        let only : Test[] = [];

        if (!reporters)
            reporters = [];

        for (let test of tests) {
            if (test.options.only)
                only.push(test);
        }

        // Order

        let order = 'default';
        
        if (testExecutionSettings && testExecutionSettings.order && <string>testExecutionSettings.order != '')
            order = testExecutionSettings.order;

        if (order == 'random') {
            let mt = new MersenneTwister();
            let seed = testExecutionSettings ? testExecutionSettings.orderSeed : undefined;
            if (typeof seed === 'undefined')
                seed = Math.round(Math.random() * 100000);

            console.log(`Ordering seed: ${seed}`);

            mt.init_seed(seed);
            tests = tests.sort((a, b) => mt.random() - 0.5);
        } else if (order == 'default') {
            // order as observed
        } else {
            throw new Error(`Test ordering '${testExecutionSettings.order}' is not supported`);
        }

        for (let test of tests) {
            let result : TestResult;

            if (only.length > 0 && !only.includes(test)) {
                result = new TestResult({ 
                    description: test.description, 
                    passed: 'skip', 
                    message: 'Skipped', 
                    hidden: true 
                });
                results.push(result);
                continue;
            }

            for (let reporter of reporters) {
                if (reporter.onTestStarted)
                    reporter.onTestStarted(this._parent as any, this, test);
            }
            
            await this.fireEvent('before');
            result = await this.runTest(test, testExecutionSettings);
            await this.fireEvent('after');

            for (let reporter of reporters) {
                if (reporter.onTestFinished)
                    reporter.onTestFinished(this._parent as any, this, test, result);
            }

            results.push(result);
        }

        return new TestSubjectResult(this._description, results);
    }
}
