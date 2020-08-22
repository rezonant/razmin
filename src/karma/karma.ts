export interface TestResult {
    id? : string;
    description : string;
    suite : string[];
    log? : string[];
    success : boolean;
    skipped : boolean;
}

export interface InfoMessage extends Record<string,any> {
    event : string;
}

export interface SuiteResult {
    order? : any;
    coverage? : any;
}

export interface Karma {
    result(testResult : TestResult);
    complete(suiteResult? : SuiteResult);
    error(message : string);
    info(message : InfoMessage);
}
