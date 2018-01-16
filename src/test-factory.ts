import { TestBuilder } from "./test-builder";

export interface TestFactory {
    (it : TestBuilder) : void;
}