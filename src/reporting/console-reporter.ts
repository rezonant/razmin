import { TestSuiteResults } from "../suite";
import * as colors from 'colors/safe';

export function ConsoleReporter(results : TestSuiteResults) : void {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (let subjectResult of results.subjectResults) {
        if (subjectResult.tests.length == 0)
            continue;
        
        console.log();
        console.log(colors.yellow(subjectResult.description));

        for (let testResult of subjectResult.tests) {
            total += 1;

            let report = !testResult.hidden;

            if (testResult.passed === 'skip') {
                skipped += 1;
                if (report)
                    console.log(colors.yellow(` (S) ${subjectResult.description} ${testResult.description}`));
            } else if (testResult.passed) {
                passed += 1;
                if (report) 
                    console.log(colors.green(`  ✓  ${subjectResult.description} ${testResult.description}`));
            } else {
                failed += 1;
                if (report) {
                    console.log(colors.red( `  ✗  ${subjectResult.description} ${testResult.description}`));
                    console.log(            `     ${testResult.message}`);
                }
            }
        }
    }

    console.log();

    let allPassed = results.subjectResults.map(x => x.passed).indexOf(false) < 0;

    if ((failed > 0 && passed > 0) || skipped > 0)
        console.log(`ran ${total} test(s): ${colors.green(`${passed} passed`)}, ${colors.yellow(`${skipped} skipped`)}, ${colors.red(`${failed} failed`)}`);
    else if (failed > 0)
        console.log(`${colors.red(`${failed} / ${total} test(s) failed`)}`);
    else // passed > 0
        console.log(`${colors.green(`${passed} test(s) passed`)}`);
    
    console.log();
    
    if (!allPassed) {
        console.log('Some tests failed!');
    } else {
        console.log('All tests pass!');
    }
}