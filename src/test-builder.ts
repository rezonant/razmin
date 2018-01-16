import { TestFunction } from './test-function';

export interface TestBuilder {
    (testDescription : string, testFunction : TestFunction) : void;
}
