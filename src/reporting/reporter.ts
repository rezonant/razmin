import { TestSuiteResults } from "../suite";

export interface Reporter {
    (results : TestSuiteResults) : void;
}