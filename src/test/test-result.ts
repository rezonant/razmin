
export class TestResult {
    public constructor(
        private _description : string,
        private _passed : boolean | 'skip',
        private _message? : string,
        private _hidden : boolean = false
    ) {

    }

    public get hidden() {
        return this._hidden;
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