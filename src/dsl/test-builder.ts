import { TestFunction, TestOptions } from '../test';

export interface TestBuilder {
    (testDescription : string, testFunction : TestFunction, options? : TestOptions) : void;
    skip(testDescription : string, func : TestFunction) : void;
    only(testDescription : string, func : TestFunction) : void;
}
