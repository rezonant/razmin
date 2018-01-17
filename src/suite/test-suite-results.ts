import { TestSubjectResult } from "../subject";
import * as colors from 'colors/safe';

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
            console.log();
            console.log(colors.yellow(subjectResult.description));

            for (let testResult of subjectResult.tests) {
                if (testResult.passed) {
                    console.log(colors.green(`  ✓  ${subjectResult.description} ${testResult.description}`));
                } else {
                    console.log(colors.red(`  ✗  ${subjectResult.description} ${testResult.description}`));
                    console.log(`${testResult.message}`);
                }
            }

        }
    }
}