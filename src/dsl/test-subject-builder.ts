import { TestBuilder } from "./test-builder";
import { TestFactory } from "./test-factory";
import { TestOptions } from "../test";

export interface TestSubjectBuilder {
    (description : string, testFactory : TestFactory, options? : TestOptions);
    skip(testDescription : string, func : TestFactory, options? : TestOptions) : void;
    only(testDescription : string, func : TestFactory, options? : TestOptions) : void;
}
