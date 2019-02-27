import { Reporter } from "../reporting";

export interface TestReportingSettingsSpec {
    reporters? : Reporter[];
    
    /**
     * Set to true to have Razmin exit the process once all tests are complete,
     * with a zero exit code for success and a one exit code for failure.
     */
    exitAndReport? : boolean;

    /**
     * If a test runs longer than this time (in milliseconds),
     * mark it as slow
     */
    slowThreshold? : number;

    /**
     * Test must run longer than this for it's duration to be included 
     * in the report
     */
    minimumReportedDuration? : number;
}

export class TestReportingSettings implements TestReportingSettingsSpec {
    public constructor(def? : TestReportingSettingsSpec) {
        if (def)
            Object.assign(this, def);
    }

    reporters : Reporter[] = [ ];
    exitAndReport : boolean = false;
    slowThreshold : number = 75;
    minimumReportedDuration : number = 15;

    clone(props : TestReportingSettingsSpec) {
        return Object.assign(new TestReportingSettings(this), props);
    }
}