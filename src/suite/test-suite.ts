import { Test } from "../test";
import { TestFunction } from "../test";
import { TestSubject } from "../subject";
import { TestSubjectResult } from "../subject";
import { TestSuiteResults } from "../suite";
import { TestExecutionSettings, globalSuiteSettings, setGlobalSuite } from "../core";
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

    public static get current(): TestSuite {
        return this.global || Zone.current.get('razminTestSuite');
    }

    private static _global : TestSuite;

    public static get global() : TestSuite {
        if (!this._global) {
            let settings = globalSuiteSettings();
            if (settings) {
                this._global = setGlobalSuite(new TestSuite(
                    new TestExecutionSettings(settings.execution), 
                    new TestReportingSettings(settings.reporting)
                ));
            }
        }
        
        return this._global;
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

    get reporters() {
        return this._reportingSettings.reporters || [];
    }

    public set reportingSettings(value : TestReportingSettings) {
        this._reportingSettings = value;
    }

    public set executionSettings(value : TestExecutionSettings) {
        this._executionSettings = value;
    }

    public get only() {
        return this.tests.some(x => x.options.only);
    }

    public get tests() : Test[] {
        return [].concat(...this.subjects.map(x => x.tests).filter(x => x));
    }

    async run(): Promise<TestSuiteResults> {
        
        for (let reporter of this.reporters) {
            if (reporter.onSuiteStarted)
                reporter.onSuiteStarted(this);
        }

        this.executionSettings.only = this.only;

        let results : TestSubjectResult[] = [];
        for (let subject of this._subjects) {
            let result = await subject.run(this.reporters, this.executionSettings);
            results.push(result);
        }

        let suiteResults = new TestSuiteResults(this, results);
        
        for (let reporter of this.reporters) {
            if (reporter.onSuiteFinished)
                reporter.onSuiteFinished(this, suiteResults);
        }

        if (this._reportingSettings.exitAndReport !== false) {

            if (typeof process !== 'undefined' && process.exit) {
                process.exit(suiteResults.passed ? 0 : 1);
            } else {
                console.log(`Razmin: Testing finished. Passed=${suiteResults.passed}`);
            }
        }

        return suiteResults;
    }

    addSubject(subject : TestSubject) {
        this._subjects.push(subject);
    }
}
