import { TestSuiteResults } from "../suite";
import * as colors from 'colors/safe';
import { descriptionConcat } from "../util";

export function ConsoleReporter(results : TestSuiteResults) : void {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (let subjectResult of results.subjectResults) {
        if (subjectResult.tests.length == 0)
            continue;
        
        console.log();
        console.log(colors.yellow.underline(subjectResult.description));

        for (let testResult of subjectResult.tests) {
            total += 1;

            let report = !testResult.hidden;
            let blankSpot = '     ';
            let indicator = blankSpot;
            let color : Function = c => c;
            let printMessage : boolean = false;
            let durationText = ``;
            let slowThreshold = results.testSuite.reportingSettings.slowThreshold;
            let minimumDuration = results.testSuite.reportingSettings.minimumReportedDuration;
            let fast = testResult.duration < minimumDuration;
            let slow = testResult.duration > 0.5*slowThreshold;
            let verySlow = testResult.duration > slowThreshold;

            if (verySlow)
                durationText = ` ${colors.red.bold(`[${testResult.duration}ms]`)}`;
            else if (slow)
                durationText = ` ${colors.yellow.bold(`[${testResult.duration}ms]`)}`;
            else if (!fast)
                durationText = ` ${colors.cyan(`[${testResult.duration}ms]`)}`;

            if (testResult.passed === 'skip') {
                skipped += 1;
                color = colors.yellow;
                indicator = ' (S) ';
            } else if (testResult.passed) {
                passed += 1;
                color = colors.green;
                indicator = '  ✓  ';
                
            } else {
                failed += 1;
                color = colors.red;
                indicator = '  ✗  ';
                printMessage = true;
            }

            if (report) {
                console.log(color(`${indicator}${descriptionConcat(subjectResult.description, testResult.description)}${durationText}`));
                if (printMessage)
                    console.log(`${blankSpot}${testResult.message}`);
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