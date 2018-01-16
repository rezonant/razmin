require('source-map-support').install();

import { TestSuite } from "../suite";
import { Reporter } from '../reporting';
import { TestExecutionSettings, TestExecutionSettingsDef } from "../core";
import { TestSubject } from "../subject";
import { TestFunction } from "../test";
import { TestSuiteFactory } from "./index";
import { TestSuiteResults } from "index";

export interface DslSettings {
    reporters? : Reporter[];
    testExecutionSettings? : TestExecutionSettingsDef;
}

/**
 * Define and execute a test suite
 * @param builder 
 */
export async function suite(builder : TestSuiteFactory, settings?: DslSettings): Promise<TestSuiteResults> {

    if (!settings)
        settings = {};

    // Build the test suite 

    let testSuite : TestSuite = new TestSuite(new TestExecutionSettings(settings.testExecutionSettings));
    builder((description, testFactory) => {
        let subject = new TestSubject(description);
        testFactory((testDescription : string, func : TestFunction) => subject.addTest(testDescription, func));
        testSuite.addSubject(subject);
    });

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