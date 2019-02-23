import { Test } from "../test";
import { TestFunction } from "../test";
import { TestSubject } from "../subject";
import { TestSubjectResult } from "../subject";
import { TestSuiteResults } from "../suite";
import { TestExecutionSettings } from "../core";
import { LifecycleContainer } from "../util";
import { TestReportingSettings } from "../core/test-reporting-settings";

export class TestSuite implements LifecycleContainer {
    constructor(
        private _executionSettings? : TestExecutionSettings,
        private _reportingSettings? : TestReportingSettings
    ) {
        if (!this._executionSettings)
            this._executionSettings = new TestExecutionSettings();

        if (!this._reportingSettings)
            this._reportingSettings = new TestReportingSettings();
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

    public get executionSettings() {
        return this._executionSettings;
    }

    public get reportingSettings() {
        return this._reportingSettings;
    }

    public set reportingSettings(value : TestReportingSettings) {
        this._reportingSettings = value;
    }

    public set executionSettings(value : TestExecutionSettings) {
        this._executionSettings = value;
    }

    async run(): Promise<TestSuiteResults> {
        let results : TestSubjectResult[] = [];
        for (let subject of this._subjects) {
            let result = await subject.run(this.executionSettings);
            results.push(result);
        }

        return new TestSuiteResults(this, results);
    }

    addSubject(subject : TestSubject) {
        this._subjects.push(subject);
    }
}
