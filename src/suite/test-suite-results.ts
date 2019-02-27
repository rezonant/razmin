import { TestSubjectResult } from "../subject";
import { TestSuite } from "./test-suite";
import { Reporter } from "../reporting";

export class TestSuiteResults {
    public constructor(
        private _testSuite : TestSuite,
        private _subjectResults : TestSubjectResult[]
    ) {
    }

    public get testSuite() {
        return this._testSuite;
    }
    
    public get subjectResults() {
        return this._subjectResults;
    }

    public get passed() {
        return this._subjectResults.map(x => x.passed).indexOf(false) < 0;
    }

    public report(reporters? : Reporter[]) {
        if (reporters)
            reporters.forEach(reporter => reporter.onSuiteFinished(this.testSuite, this));
    }
}