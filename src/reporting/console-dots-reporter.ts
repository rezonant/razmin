import { TestSuiteResults, TestSuite } from "../suite";
import * as colors from 'colors/safe';
import { descriptionConcat } from "../util";
import { Reporter } from "./reporter";
import { TestSubject } from "../subject";
import { Test, TestResult } from "../test";

export class ConsoleDotsReporter implements Reporter {
    onTestFinished(suite : TestSuite, subject : TestSubject, test : Test, result : TestResult) {
        if (typeof process !== 'undefined') {
            if (result.passed === 'skip') {
                process.stdout.write(colors.yellow("S"));
            } else if (result.passed) {
                process.stdout.write(colors.green("."));
            } else {
                process.stdout.write(colors.red("F"));
            }
        }
    }

    onSuiteFinished(suite : TestSuite, results : TestSuiteResults) {
        console.log();

        let total = 0;
        let passed = 0;
        let failed = 0;
        let skipped = 0;
    
        for (let subjectResult of results.subjectResults) {
            for (let test of subjectResult.tests) {
                total += 1;
                if (test.passed === 'skip')
                    skipped += 1;
                else if (test.passed)
                    passed += 1;
                else
                    failed += 1;
            }
        }

        for (let subjectResult of results.subjectResults) {
            if (subjectResult.tests.length == 0)
                continue;
            
            if (!subjectResult.tests.find(x => !x.passed))
                continue;

            console.log();
            console.log(colors.yellow(colors.underline(subjectResult.description)));
    
            for (let testResult of subjectResult.tests) {
                if (testResult.passed)
                    continue;
                
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
                    durationText = ` ${colors.red(colors.bold(`[${testResult.duration}ms]`))}`;
                else if (slow)
                    durationText = ` ${colors.yellow(colors.bold(`[${testResult.duration}ms]`))}`;
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
            console.log(`${total} tests: ${colors.green(`${passed} passed`)}, ${colors.yellow(`${skipped} skipped`)}, ${colors.red(`${failed} failed`)}`);
        else if (failed > 0)
            console.log(`${colors.red(`${failed} / ${total} test(s) failed`)}`);
        else if (total > 0)
            console.log(`${colors.green(`${passed} test(s) passed`)}`);
        else
            console.log(`${colors.yellow(`0 test(s) defined`)}`);
        
        console.log();
    }
}