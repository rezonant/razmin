require('source-map-support').install();

import { TestSuite } from "../suite";
import { Reporter } from '../reporting';
import { TestExecutionSettings, TestExecutionSettingsDef } from "../core";
import { TestSubject } from "../subject";
import { TestFunction } from "../test";
import { TestSuiteResults } from "../suite";

import { TestSuiteFactory } from "./test-suite-factory";

export interface DslSettings {
    reporters? : Reporter[];
    testExecutionSettings? : TestExecutionSettingsDef;
}

let topLevelSuite : TestSuite = null;

/**
 * Define and execute a test suite
 * @param builder 
 */
export async function suite(builder : TestSuiteFactory, settings?: DslSettings): Promise<TestSuiteResults> {



    if (!settings)
        settings = {};

    // Build the test suite 

    let testSuite : TestSuite;
    let top = false;

    if (topLevelSuite) {
        testSuite = topLevelSuite;
    } else {
        testSuite = topLevelSuite = new TestSuite(new TestExecutionSettings(settings.testExecutionSettings));
        top = true;
    }

    builder((description, testFactory) => {
        let subject = new TestSubject(description);
        testFactory((testDescription : string, func : TestFunction) => subject.addTest(testDescription, func));
        testSuite.addSubject(subject);
    });

    if (!top)
        return;

    topLevelSuite = null;

    // Run the test suite

    let results = await testSuite.run();
    if (settings.reporters !== undefined) {
        settings.reporters.forEach(reporter => reporter(results));
    } else {
        // Default text output
        results.report();
    }
    
    return results;
}