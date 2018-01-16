import { TestBuilder } from "./test-builder";
import { TestFactory } from "./test-factory";

export interface TestSubjectBuilder {
    (description : string, testFactory : TestFactory);
}
