import type { Karma } from "./karma";
import { TestSuite, TestSuiteResults } from "../suite";
import { Reporter } from "../reporting";
import { TestSubject } from "../subject";
import { Test, TestResult } from "../test";
import { SuiteSettings } from "../core";

let karma : Karma;

class RazminKarmaReporter implements Reporter {
    onSuiteStarted(suite : TestSuite) {
        console.log(`Razmin/Karma: Suite started with ${suite.tests.length} tests over ${suite.subjects.length} subjects`);
    }

    onSubjectStarted(suite: TestSuite, subject: TestSubject): any {
        console.log(`Razmin/Karma: Subject '${subject.description}' started`);
    }

    onTestStarted(suite: TestSuite, subject: TestSubject, test: Test): any {
        console.log(`Razmin/Karma: Test '${test.description}' started`);
        
    }

    onTestFinished(suite: TestSuite, subject: TestSubject, test: Test, result: TestResult): any {
        console.log(`Razmin/Karma: Test '${test.description}' finished: ${result.passed ? 'passed' : 'failed'}`);
        karma?.result({
            description: test.description,
            skipped: result.passed === 'skip',
            success: result.passed === true,
            log: [],
            suite: [ subject.description ], // TODO
        })
    }

    onSubjectFinished(suite: TestSuite, subject: TestSubject): any {
        console.log(`Razmin/Karma: Subject '${subject.description}' finished`);
    }

    onSuiteFinished(suite: TestSuite, results: TestSuiteResults): any {
        console.log(`Razmin/Karma: Suite finished: ${results.passed ? 'passed' : 'failed'}`);
        karma?.complete({ });
    }

}

// Bootstrap

if (typeof window !== 'undefined' && window['__karma__']) {
    console.log(`Razmin/Karma: Bootstrapping...`);

    window['__razminGlobalSuiteSettings'] = <SuiteSettings>{
        execution: {
        },
        reporting: {
            exitAndReport: false,
            reporters: [
                new RazminKarmaReporter()
            ]
        }
    }
    window['__karma__'].start = k => {
        console.log(`Razmin/Karma: Karma has initialized us!`);
        karma = k
    };

    if (typeof module === 'undefined') 
        window['module'] = <any>{};
}