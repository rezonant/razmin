import { TestSuiteResults, TestSuite } from "../suite";
import * as colors from 'colors/safe';
import { descriptionConcat } from "../util";
import { Test, TestResult } from "../test";
import { Reporter } from "./reporter";
import * as junit from 'junit-xml';
import * as fs from 'fs';

export class JUnitXMLReporter implements Reporter {
    onSuiteFinished(suite : TestSuite, results : TestSuiteResults) {
        results.subjectResults
        let xml = junit.getJunitXml({
            suites: results.subjectResults.map<junit.TestSuite>(subjectResult => ({
                testCases: subjectResult.tests.map<junit.TestCase>(test => ({
                    name: test.description,
                    failures: test.passed ? [] : [ 
                        {
                            message: test.message
                        }
                    ],
                    time: test.duration,
                    skipped: test.passed === 'skip'
                }))
            }))
        });

        fs.writeFileSync('test-results.xml', xml);
    }
}