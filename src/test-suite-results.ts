import { TestSubjectResult } from "./test-subject-result";


export class TestSuiteResults {
    public constructor(
        private _subjectResults : TestSubjectResult[]
    ) {
    }

    public get subjectResults() {
        return this._subjectResults;
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