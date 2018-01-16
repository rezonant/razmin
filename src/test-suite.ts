import { TestSubjectBuilder } from "./test-subject-builder";
import { TestBuilder } from "./test-builder";
import { TestSuiteFactory } from "./test-suite-factory";
import { Test } from "./test";
import { TestFunction } from "./test-function";
import { TestSubject } from "./test-subject";
import { TestFactory } from "./test-factory";
import { TestSubjectResult } from "./test-subject-result";
import { TestSuiteResults } from "./test-suite-results";
import { TestExecutionSettings } from "./test-execution-settings";


export class TestSuite {
    TestSuite() {

    }

    _subjects : TestSubject[] = [];
    _testExecutionSettings : TestExecutionSettings = new TestExecutionSettings({
        contextName: 'Test Suite',
        timeout: 10 * 1000
    });

    public get testExecutionSettings() {
        return this._testExecutionSettings;
    }

    async run(): Promise<TestSuiteResults> {
        return new TestSuiteResults(await Promise.all(this._subjects.map(x => x.run(this.testExecutionSettings))));
    }

    addSubject(subject : TestSubject) {
        this._subjects.push(subject);
    }

    buildSubject(subjectDescription : string, factory : TestFactory): TestSubject {
        let subject = TestSubject.build(subjectDescription, factory);
        this._subjects.push(subject);
        return subject;
    }
}
