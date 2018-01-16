import { TestSubjectBuilder } from "./test-subject-builder";


export interface TestSuiteBuilder {
    (builder : TestSubjectBuilder) : void;
}