import { Test, TestOptions } from "../test";
import { TestFunction } from "../test";
import { TestSubjectResult } from "../subject";
import { TestResult } from "../test";
import { TestExecutionSettings } from "../core";
import { LifecycleContainer } from "../util";

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
        return test.run(testExecutionSettings, `${this._description} ${test.description}`);
    }

    /**
     * Run all tests that deal with this test subject.
     * @param testExecutionSettings 
     */
    public async run(testExecutionSettings? : TestExecutionSettings): Promise<TestSubjectResult> {
        let results : TestResult[] = [];

        for (let test of this._tests) {
            let result : TestResult;

            await this.fireEvent('before');
            result = await this.runTest(test, testExecutionSettings);
            await this.fireEvent('after');

            results.push(result);
        }

        return new TestSubjectResult(this._description, results);
    }
}
