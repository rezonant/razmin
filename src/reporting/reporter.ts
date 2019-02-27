import { TestSuiteResults } from "../suite";
import { Test, TestResult } from "../test";

export interface Reporter {
    onTestStarted?(test : Test);
    onTestFinished?(test : Test, result : TestResult);
    onSuiteFinished?(results : TestSuiteResults);
}