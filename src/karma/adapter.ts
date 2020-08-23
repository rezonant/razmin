import { Karma } from "./karma";
import { TestSuite, TestSuiteResults } from "../suite";
import { Reporter, ConsoleReporter } from "../reporting";
import { TestSubject } from "../subject";
import { Test, TestResult } from "../test";
import { SuiteSettings } from "../core";

declare var __karma__ : Karma;

class RazminKarmaReporter implements Reporter {
    onSuiteLoaded(suite : TestSuite) {
        __karma__.info({ 
            event: 'razminStarted',
            total: suite.tests.length
        });
        suite.run();
    }

    onSuiteFinished(suite: TestSuite, results: TestSuiteResults): any {
        for (let suiteResult of results.subjectResults) {
            for (let testResult of suiteResult.tests) {
                __karma__.result({
                    description: testResult.description,
                    skipped: testResult.passed === 'skip',
                    success: testResult.passed === true,
                    log: [],
                    suite: [ suiteResult.description ],
                })
            }
        }
        __karma__.complete({  });
    }
}

// Bootstrap

if (typeof window !== 'undefined' && typeof __karma__ !== 'undefined') {
    window['__razminGlobalSuiteSettings'] = <SuiteSettings>{
        execution: {},
        reporting: {
            exitAndReport: false,
            reporters: [ new RazminKarmaReporter(), new ConsoleReporter() ]
        }
    }
    __karma__.start = () => {};
}