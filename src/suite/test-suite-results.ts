import { TestSubjectResult } from "../subject";
import { TestSuite } from "./test-suite";

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

    public exitAndReport() {
        if (!this.passed) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }

    public report(reporters? : Function[]) {
        if (reporters)
            reporters.forEach(reporter => reporter(this));
    }
}