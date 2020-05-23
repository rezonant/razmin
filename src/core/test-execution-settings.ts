export interface TestExecutionSettingsSpec {
    contextName? : string;

    /**
     * Maximum amount of time (in milliseconds)
     * that tests can run. If they run longer, 
     * they are considered a failure.
     */
    timeout? : number;

    verbose? : boolean;

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

    /**
     * Run this suite independent of any enclosing suite (by zone)
     */
    isolated? : boolean;
}

export class TestExecutionSettings implements TestExecutionSettingsSpec {
    public constructor(def? : TestExecutionSettingsSpec) {
        if (def)
            Object.assign(this, def);
    }
    
    verbose = false;
    contextName : string;
    timeout : number = 10 * 1000;
    order : 'default' | 'random' = 'default';
    orderSeed : number = undefined;
    only = false;

    clone(props : TestExecutionSettingsSpec) {
        return Object.assign(new TestExecutionSettings(this), props);
    }
}