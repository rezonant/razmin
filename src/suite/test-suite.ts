import { Test } from "../test";
import { TestFunction } from "../test";
import { TestSubject } from "../subject";
import { TestSubjectResult } from "../subject";
import { TestSuiteResults } from "../suite";
import { TestExecutionSettings } from "../core";

export class TestSuite {    
    constructor(
        private _testExecutionSettings? : TestExecutionSettings
    ) {
        if (!this._testExecutionSettings) {
            this._testExecutionSettings = new TestExecutionSettings({
                contextName: 'Test Suite',
                timeout: 10 * 1000
            });
        }
    }

    private _subjects : TestSubject[] = [];

    public get subjects() {
        return this._subjects.slice();
    }

    public get testExecutionSettings() {
        return this._testExecutionSettings;
    }

    async run(): Promise<TestSuiteResults> {
        return new TestSuiteResults(await Promise.all(this._subjects.map(x => x.run(this.testExecutionSettings))));
    }

    addSubject(subject : TestSubject) {
        this._subjects.push(subject);
    }
}
