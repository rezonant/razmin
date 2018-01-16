
export class TestResult {
    public constructor(
        private _description : string,
        private _passed : boolean,
        private _message? : string
    ) {

    }

    public get description() {
        return this._description;
    }
    
    public get passed() {
        return this._passed;
    }

    public get message() {
        return this._message;
    }
}