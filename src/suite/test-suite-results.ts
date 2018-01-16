import { TestSubjectResult } from "../subject";

export class TestSuiteResults {
    public constructor(
        private _subjectResults : TestSubjectResult[]
    ) {
    }

    public get subjectResults() {
        return this._subjectResults;
    }

    public get passed() {
        return this._subjectResults.map(x => x.passed).indexOf(false) < 0;
    }

    public report() {
        for (let subjectResult of this._subjectResults) {
            for (let testResult of subjectResult.tests) {
                console.log(`(${testResult.passed ? 'PASS' : 'FAIL'}) ${subjectResult.description} ${testResult.description}`);
                if (!testResult.passed) {
                    console.log(` - ${testResult.message}`);
                }
            }
        }
    }
}