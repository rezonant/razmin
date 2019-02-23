export interface TestExecutionSettingsDef {
    /**
     * Maximum amount of time (in milliseconds)
     * that tests can run. If they run longer, 
     * they are considered a failure.
     */
    timeout? : number;
    contextName? : string;

    /**
     * Define the order to run the tests.
     * Use 'default' for load order, and 
     * 'random' to randomly order the tests.
     * See `orderSeed`.
     */
    order? : 'default' | 'random';

    /**
     * Specify the seed to use to order the 
     * tests for execution. Leave undefined 
     * to have a seed chosen at runtime.
     */
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