import { TestSubjectBuilder } from "./test-subject-builder";

export interface TestSuiteFactory {
    (describe : TestSubjectBuilder) : void;
}
