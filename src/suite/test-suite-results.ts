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

    public exitAndReport() {
        if (!this.passed) {
            console.log('Some tests failed!');
            process.exit(1);
        } else {
            console.log('All tests pass!');
            process.exit(0);
        }
    }
    public report() {
        let total = 0;
        let passed = 0;
        let failed = 0;
        let skipped = 0;

        for (let subjectResult of this._subjectResults) {
            console.log();
            console.log(colors.yellow(subjectResult.description));

            for (let testResult of subjectResult.tests) {
                total += 1;
                if (testResult.passed) {
                    passed += 1;
                    console.log(colors.green(`  ✓  ${subjectResult.description} ${testResult.description}`));
                } else {
                    failed += 1;
                    console.log(colors.red( `  ✗  ${subjectResult.description} ${testResult.description}`));
                    console.log(            `     ${testResult.message}`);
                }
            }
        }

        console.log();
        console.log(`ran ${total} test(s): ${colors.green(`${passed} passed`)}, ${colors.red(`${failed} failed`)}`);
        console.log();
    }
}