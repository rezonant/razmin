import { TestSuiteResults, TestSuite } from "../suite";
import { Test, TestResult } from "../test";
import { TestSubject } from "../subject";

export interface Reporter {
    onSuiteStarted?(suite : TestSuite);
    onSubjectStarted?(suite : TestSuite, subject : TestSubject);
    onTestStarted?(suite: TestSuite, subject : TestSubject, test : Test);
    onTestFinished?(suite: TestSuite, subject : TestSubject, test : Test, result : TestResult);
    onSubjectFinished?(suite: TestSuite, subject : TestSubject);
    onSuiteFinished?(suite : TestSuite, results : TestSuiteResults);
}