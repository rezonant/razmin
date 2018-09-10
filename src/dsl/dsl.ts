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
    exitAndReport? : boolean;
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

    let testSuite : TestSuite;
    let top = false;
    let topLevelSuite = Zone.current.get('razminTestSuite');

    if (topLevelSuite) {
        testSuite = topLevelSuite;
    } else {
        testSuite = topLevelSuite = new TestSuite(new TestExecutionSettings(settings.testExecutionSettings));
        top = true;
    }

    let zone = Zone.current.fork({
        name: 'suite-zone',
        properties: {
            razminTestSuite: testSuite
        },
    });
    
    await new Promise((resolve, reject) => {
        zone.run(async () => {
            try { 
                await builder((description, testFactory) => {
                    let subject = new TestSubject(description);
                    testFactory((testDescription : string, func : TestFunction) => subject.addTest(testDescription, func));
                    testSuite.addSubject(subject);
                });
                
                resolve();
            } catch (e) {
                console.error(`Caught error while building test:`);
                console.error(e);

                reject(e);
            }
        });
    });

    if (!top)
        return;

    topLevelSuite = null;

    // Run the test suite

    let results : TestSuiteResults;
    
    try {
        results = await testSuite.run();
    } catch (e) {
        console.error(`Caught error while running test suite:`);
        console.error(e);
        throw e;
    }

    if (settings.reporters !== undefined) {
        settings.reporters.forEach(reporter => reporter(results));
    } else {
        // Default text output
        results.report();
    }

    if (settings.exitAndReport !== false)
        results.exitAndReport();

    return results;
}