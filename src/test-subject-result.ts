import { TestResult } from "./test-result";


export class TestSubjectResult {
    public constructor(
        private _description : string,
        private _results : TestResult[]
    ) {
    }

    public get description() {
        return this._description;
    }

    public get tests() {
        return this._results;
    }
}