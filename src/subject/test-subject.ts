import { Test } from "../test";
import { TestFunction } from "../test";
import { TestSubjectResult } from "../subject";
import { TestResult } from "../test";
import { TestExecutionSettings } from "../core";

/**
 * Represents a set of unit tests built around a single object under test ("subject")
 */
export class TestSubject {
    public constructor(
        private _description : string
    ) {

    }

    private _tests : Test[] = [];

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
    public addTest(description : string, func : TestFunction) {
        this._tests.push(new Test(description, func));
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
        return new TestSubjectResult(this._description, 
            await Promise.all(this._tests.map (test => this.runTest(test, testExecutionSettings)))
        );
    }
}
