export interface TestExecutionSettingsDef {
    timeout? : number;
    contextName? : string;
    order? : 'default' | 'random';
    orderSeed? : number;
}

export class TestExecutionSettings implements TestExecutionSettingsDef {
    public constructor(def? : TestExecutionSettingsDef) {
        if (def)
            Object.assign(this, def);
    }
    
    contextName : string;
    timeout : number = 10 * 1000;
    order : 'default' | 'random' = 'default';
    orderSeed : number = undefined;

    clone(props : TestExecutionSettingsDef) {
        return Object.assign(new TestExecutionSettings(this), props);
    }
}