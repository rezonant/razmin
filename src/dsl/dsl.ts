/**
 * Provides the "DSL" (domain specific language) component of Razmin. This can be thought of as the UI,
 * providing developers the ability to tersely specify and run their tests.
 */

require('source-map-support').install();

import { TestSuite } from "../suite";
import { Reporter } from '../reporting';
import { TestExecutionSettings, TestExecutionSettingsSpec } from "../core";
import { TestSubject } from "../subject";
import { TestFunction, TestOptions, Skip } from "../test";
import { TestSuiteResults } from "../suite";

import { TestSuiteFactory } from "./test-suite-factory";

import * as requireGlob from 'require-glob';
import * as callsites from 'callsites';
import * as path from 'path';
import { TestSubjectBuilder } from "./test-subject-builder";
import { TestFactory } from "./test-factory";
import { LifecycleContainer, TestZone, descriptionConcat } from "../util";
import { TestBuilder } from "./test-builder";
import { ConsoleReporter } from "../reporting";
import { TestReportingSettingsSpec, TestReportingSettings } from "../core/test-reporting-settings";

function applyDefaultSettings(settings : SuiteSettings) {
    if (!settings)
        settings = {};

    if (!settings.reporting)
        settings.reporting = {};

    if (!settings.reporting.reporters)
        settings.reporting.reporters = [ new ConsoleReporter() ];

    if (typeof settings.reporting.exitAndReport === 'undefined')
        settings.reporting.exitAndReport = true;
    
    return settings;
}

export class FluentSuite {
    constructor(settings : SuiteSettings = {}) {
        this._settings = applyDefaultSettings(settings);
        this.suite = new TestSuite(new TestExecutionSettings(this._settings.execution), new TestReportingSettings(this._settings.reporting));
    }

    private _settings : SuiteSettings;
    readonly suite : TestSuite;

    get settings() {
        return this._settings;
    }

    withTimeout(millis : number): this {
        if (!this._settings.execution)
            this._settings.execution = {};
        this._settings.execution.timeout = millis;

        return this;
    }

    withOptions(settings : SuiteSettings): this {
        settings = applyDefaultSettings(settings);
        
        this._settings = settings;
        this.suite.executionSettings = new TestExecutionSettings(settings.execution);
        this.suite.reportingSettings = new TestReportingSettings(settings.reporting);
        
        return this;
    }

    include(paths : string[]): this {
        let origDir = process.cwd();
        let callerFile = callsites()[1].getFileName();
        if (callerFile)
            process.chdir(path.dirname(callerFile));

        try {
            buildSuite(paths, this.settings, this.suite);
        } finally {
            process.chdir(origDir);
        }

        return this;
    }

    async run() {
        return await this.suite.run();
    }
}

/**
 * Specify settings for this test suite.
 */
export interface SuiteSettings {
    execution? : TestExecutionSettingsSpec;
    reporting? : TestReportingSettingsSpec;
}

export async function runSuite(paths : string[], options? : SuiteSettings): Promise<TestSuiteResults> {
    return await (await buildSuite(paths, options)).run();
}

export async function buildSuite(paths : string[], options? : SuiteSettings, testSuite? : TestSuite): Promise<TestSuite> {
    options = applyDefaultSettings(options);
    
    // Build the test suite 

    let top = false;

    if (!testSuite) {
        testSuite = new TestSuite(
            new TestExecutionSettings(options.execution), 
            new TestReportingSettings(options.reporting)
        );
    }

    let zone = Zone.current.fork({
        name: 'razminSuiteZone',
        properties: {
            razminTestSuite: testSuite,
            razminLifecycleContainer: testSuite
        },
    });
    
    await new Promise((resolve, reject) => {
        zone.run(async () => {
            try { 
                requireGlob.sync(paths, {
                    cwd: process.cwd()
                });
                resolve();
            } catch (e) {
                console.error(`Caught error while building test:`);
                console.error(e);

                reject(e);
            }
        });
    });

    return testSuite;
}

async function describeRaw(description : string, testFactory : TestFactory, options? : TestOptions) {
    let testSuite : TestSuite = Zone.current.get('razminTestSuite');
    if (!testSuite) {
        suiteDeclaration(() => describe(description, testFactory));
        return;
    }

    let parentSubject : TestSubject = Zone.current.get('razminSubject');
    if (parentSubject)
        description = descriptionConcat(parentSubject.description, description);

    let parent : LifecycleContainer = Zone.current.get('razminLifecycleContainer');;
    if (!parent)
        parent = testSuite;

    let subject = new TestSubject(description, parent);
    testSuite.addSubject(subject);

    let zone = Zone.current.fork({
        name: 'razminSubjectZone',
        properties: {
            razminSubject: subject,
            razminLifecycleContainer: subject
        }
    });

    // TODO: use options

    await new Promise((resolve, reject) => {
        zone.run(async () => {
            try { 
                await testFactory(it);
                resolve();
            } catch (e) {
                console.error(`Caught error while building test:`);
                console.error(e);

                reject(e);
            }
        });
    });
}

describeRaw['skip'] = (desc, fac, opts?) => {
    describeRaw(desc, fac, Object.assign({ skip: true }, opts || {}));
};

describeRaw['only'] = (desc, fac, opts?) => {
    describeRaw(desc, fac, Object.assign({ only: true }, opts || {}));
};

export const describe : TestSubjectBuilder = describeRaw as any;

export function skip() {
    throw new Skip();
}

export function before(func : Function) {
    let subject : TestSubject = Zone.current.get('razminSubject');
    if (!subject)
        throw new Error(`before() must be run within a describe() block`);
    subject.addEventListener('before', () => func());
}

export function after(func : Function) {
    let subject : TestSubject = Zone.current.get('razminSubject');
    if (!subject)
        throw new Error(`after() must be run within a describe() block`);
    subject.addEventListener('after', () => func());
}

async function itRaw(testDescription : string, func? : TestFunction, options? : TestOptions) {
    let subject : TestSubject = Zone.current.get('razminSubject');
    if (!subject)
        throw new Error(`You can only call it() from inside a describe() block.`);
    
    if (func) {
        subject.addTest(testDescription, func, options);
    } else if (!options) {
        subject.addTest(testDescription, () => {}, { skip: true });
    } else {
        subject.addTest(testDescription, () => {
            throw new Error(
                `You have passed an undefined test function to it(), ` 
                + `but you included options! This is probably a mistake.`
            );
        }, options);
    }
}

itRaw['skip'] = (desc, func) => it(desc, func, { skip: true });
itRaw['only'] = (desc, func) => it(desc, func, { only: true });
export const it : TestBuilder = itRaw as any;

async function suiteDeclaration(builder : TestSuiteFactory, settings? : SuiteSettings): Promise<TestSuiteResults>
{
    settings = applyDefaultSettings(settings);

    // Build the test suite 

    let testSuite : TestSuite;
    let top = false;
    let topLevelSuite : TestSuite = Zone.current.get('razminTestSuite');
    let currentTest = Zone.current.get('razminTest');
    let zone : Zone = Zone.current;
    let isolated = settings && settings.execution && settings.execution.isolated;
    
    // or if this suite() declaration lives within an it() declaration,
    // then we must not join our results onto the parent suite
    if (currentTest && topLevelSuite) {
        if (topLevelSuite.executionSettings.verbose) {
            console.warn(
                `Warning: Detected a suite() declaration inside an it() test. ` 
                + `The inner suite will run independently of the outer suite (forcing execution.isolated to be true)`);
        }

        isolated = true;
    }

    // If we were asked to remain isolated from any parent suite, do so
    
    if (isolated)
        topLevelSuite = null;
    
    if (topLevelSuite) {
        testSuite = topLevelSuite;
    } else {
        let executionSettings = new TestExecutionSettings(settings.execution);
        let reportingSettings = new TestReportingSettings(settings.reporting);

        // If this new suite is being declared inside another Razmin test then 
        // we must not use exitAndReport or the containing test will never complete,
        // since we will run process.exit().

        if (currentTest && reportingSettings.exitAndReport) {
            if (executionSettings.verbose) {
                console.warn(
                    `Warning: Suite declared inside of test case cannot use exitAndReport or outer suite will be interrupted. ` 
                    + `(forcing reporting.exitAndReport to be false)`);
            }
            reportingSettings.exitAndReport = false;
        }

        testSuite = topLevelSuite = new TestSuite(
            executionSettings, 
            reportingSettings
        );
        top = true;
        zone = zone.fork({
            name: 'razminSuiteZone',
            properties: {
                razminTestSuite: testSuite,

                // When you have a suite() inside it(), we want that suite 
                // to not join the parent suite, but we DO want subsuites inside
                // the inner suite to join to THAT, so clear razminTest so we 
                // don't trigger the isolation behavior further down the stack
                razminTest: null
            }
        });
    }

    await zone.run(async () => {
        await new Promise<void>((resolve, reject) => {
            // Construct a new zone to track async activity in the suite
            
            let testZone : TestZone = new TestZone('razminSuiteTracker');
            testZone.onError.subscribe(err => reject(err));
            testZone.onStable.subscribe(() => resolve());
            testZone.zone.run(async () => {
                try { 
                    await builder(describe);
                } catch (e) {
                    console.error(`Caught error while building test:`);
                    console.error(e);
                    reject(e);
                }
            });
        });
    });

    if (!top)
        return;

    topLevelSuite = null;

    // Run the test suite

    let results : TestSuiteResults;
    
    try {
        results = await testSuite.run();
    } catch (e) {
        console.error(`Caught error while running test suite:`);
        console.error(e);
        throw e;
    }

    return results;
}

function argsMatch(args : any[], patterns : string[]) {
    let satisfiedArgs = [];
    let mustBeOptional = false;
    for (let i = 0, max = Math.max(args.length, patterns.length); i < max; ++i) {
        let value = args[i];
        let hasValue = args.length > i;
        let pattern = patterns[i];
        let optional = false;

        if (hasValue && !pattern)
            return false;

        if (pattern.endsWith('?')) {
            pattern = pattern.replace(/\?$/g, '');
            optional = true;
            mustBeOptional = true;
        } else if (mustBeOptional) {
            throw new Error(`A non-optional descriptor cannot follow an optional one`);
        }

        if (optional && value === undefined)
            return true;
            
        if (!hasValue) {
            if (optional)
                return true;
            else 
                return false;
        }
        
        let matchers = {
            null: v => v === null,
            undefined: v => v === null,
            object: v => typeof v === 'object',
            function: v => typeof v === 'function',
            number: v => typeof v === 'number',
            boolean: v => typeof v === 'boolean',
            string: v => typeof v === 'string',
            true: v => v === true,
            false: v => v === false
        };

        let matches = pattern.split(/\|/g).map(pattern => {
            if (!matchers[pattern])
                throw new Error(`Unsupported pattern '${pattern}'`);

            let matcher : Function = matchers[pattern];
            let matches = matcher(value);
        
            return matches;
        }).find(x => x);

        if (!matches)
            return false;
        
        satisfiedArgs.push(value);
    }

    if (satisfiedArgs.length !== patterns.length)
        return false;
    
    return true;
}

/**
 * Define and execute a test suite
 * @param builder 
 */
export function suite() : FluentSuite;
export async function suite(builder : TestSuiteFactory, settings?: SuiteSettings): Promise<TestSuiteResults> 

export function suite(...args): any
{
    if (argsMatch(args, ['object?']))
        return new FluentSuite(args[0]);
    
    if (argsMatch(args, ['function', 'object?']))
        return suiteDeclaration(args[0], args[1]);
    
    throw new Error(`Unknown parameters: ${args.join(', ')}`);
}

export function beforeEach(handler : Function) {
    let lifecycleContainer = Zone.current.get('razminLifecycleContainer');
    if (!lifecycleContainer)
        throw new Error(`Can only be used inside suite() or describe()`);

    lifecycleContainer.addEventListener('before', handler);
}

export function afterEach(handler : Function) {
    let lifecycleContainer = Zone.current.get('razminLifecycleContainer');
    if (!lifecycleContainer)
        throw new Error(`Can only be used inside suite() or describe()`);

    lifecycleContainer.addEventListener('after', handler);
}