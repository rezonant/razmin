import { TestSuiteResults, TestSuite } from "../suite";
import * as colors from 'colors/safe';
import { descriptionConcat } from "../util";
import { Test, TestResult } from "../test";
import { Reporter } from "./reporter";
import * as junit from 'junit-xml';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

export class JUnitXMLReporter implements Reporter {
    constructor(readonly outputFile : string = 'test-results.xml') {
    }

    async onSuiteFinished(suite : TestSuite, results : TestSuiteResults) {
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

        try {
            mkdirp.sync(path.dirname(this.outputFile));
        } catch (e) {
            console.error(`JUnit XML Reporter: Failed to make directory: ${path.dirname(this.outputFile)}: ${e.message}`);
            return;
        }

        fs.writeFileSync(this.outputFile, xml);
    }
}