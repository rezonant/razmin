import { Test } from "../test";
import { TestFunction } from "../test";
import { TestSubject } from "../subject";
import { TestSubjectResult } from "../subject";
import { TestSuiteResults } from "../suite";
import { TestExecutionSettings } from "../core";
import { LifecycleContainer } from "../util";

export class TestSuite implements LifecycleContainer {
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

    addEventListener(eventName : string, handler : Function) {
        if (!this._lifecycleEvents[eventName])
            this._lifecycleEvents[eventName] = [];

        this._lifecycleEvents[eventName].push(handler);
    }

    async fireEvent(eventName : string) {
        let handlers : Function[] = this._lifecycleEvents[eventName] || [];
        for (let handler of handlers)
            await handler();
    }

    private _lifecycleEvents = {};

    private _subjects : TestSubject[] = [];

    public get subjects() {
        return this._subjects.slice();
    }

    public get testExecutionSettings() {
        return this._testExecutionSettings;
    }

    public set testExecutionSettings(value : TestExecutionSettings) {
        this._testExecutionSettings = value;
    }

    async run(): Promise<TestSuiteResults> {
        let results : TestSubjectResult[] = [];
        for (let subject of this._subjects) {
            let result = await subject.run(this.testExecutionSettings);
            results.push(result);
        }

        return new TestSuiteResults(this, results);
    }

    addSubject(subject : TestSubject) {
        this._subjects.push(subject);
    }
}
