export interface TestResultSpec {
    description : string;
    passed : boolean | 'skip';
    message? : string;
    hidden? : boolean;
    duration? : number;
}

export class TestResult {
    public constructor(
        spec : TestResultSpec
    ) {
        Object.keys(spec).forEach(key => this[`_${key}`] = spec[key]);
    }

    private _description : string;
    private _passed : boolean | 'skip';
    private _message : string = undefined;
    private _hidden : boolean = false;
    private _duration : number = undefined;

    public get duration() {
        return this._duration;
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