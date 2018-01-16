import { TestFunction } from '../test';

export interface TestBuilder {
    (testDescription : string, testFunction : TestFunction) : void;
}
