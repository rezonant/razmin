require('source-map-support').install();

import { TestSuiteFactory } from "./test-suite-factory";
import { TestSuite } from "./test-suite";

/**
 * Define and execute a test suite
 * @param builder 
 */
export async function suite(builder : TestSuiteFactory): Promise<void> {
    let testSuite : TestSuite = new TestSuite();
    builder((description, testFactory) => testSuite.buildSubject(description, testFactory));
    let results = await testSuite.run();
    results.report();
}