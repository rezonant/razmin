export interface TestExecutionSettingsDef {
    timeout? : number;
    contextName? : string;    
}

export class TestExecutionSettings implements TestExecutionSettingsDef {
    public constructor(def : TestExecutionSettingsDef) {
        Object.assign(this, def);
    }
    contextName : string;
    timeout : number = 10 * 1000;

    clone(props : TestExecutionSettingsDef) {
        return Object.assign(new TestExecutionSettings(this), props);
    }
}