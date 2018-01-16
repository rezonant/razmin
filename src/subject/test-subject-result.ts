import { TestResult } from "../test";

export class TestSubjectResult {
    public constructor(
        private _description : string,
        private _results : TestResult[]
    ) {
    }

    public get passed() {
        return this._results.map(x => x.passed).indexOf(false) < 0;
    }

    public get description() {
        return this._description;
    }

    public get tests() {
        return this._results;
    }
}