import { TestExecutionSettingsSpec } from "./test-execution-settings";
import { TestReportingSettingsSpec } from "./test-reporting-settings";

/**
 * Specify settings for this test suite.
 */
export interface SuiteSettings {
    execution? : TestExecutionSettingsSpec;
    reporting? : TestReportingSettingsSpec;
}