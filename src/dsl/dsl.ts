/**
 * Provides the "DSL" (domain specific language) component of Razmin. This can be thought of as the UI,
 * providing developers the ability to tersely specify and run their tests.
 */

require('source-map-support').install();

import { TestSuite } from "../suite";
import { Reporter } from '../reporting';
import { TestExecutionSettings, TestExecutionSettingsDef } from "../core";
import { TestSubject } from "../subject";
import { TestFunction, TestOptions } from "../test";
import { TestSuiteResults } from "../suite";

import { TestSuiteFactory } from "./test-suite-factory";

import * as requireGlob from 'require-glob';
import * as callsites from 'callsites';
import * as path from 'path';
import { TestSubjectBuilder } from "./test-subject-builder";
import { TestFactory } from "./test-factory";
import { LifecycleContainer } from "../util";
import { TestBuilder } from "./test-builder";
import { ConsoleReporter } from "../reporting";

const DEFAULT_REPORTERS = [ ConsoleReporter ];

export class FluentSuite {
    constructor(settings : DslSettings = {}) {
        this._settings = settings;
        this.suite = new TestSuite(new TestExecutionSettings(settings.testExecutionSettings));
    }

    private _settings : DslSettings;
    readonly suite : TestSuite;

    get settings() {
        return this._settings;
    }

    withTimeout(millis : number): this {
        if (!this._settings.testExecutionSettings)
            this._settings.testExecutionSettings = {};
        this._settings.testExecutionSettings.timeout = millis;

        return this;
    }

    withOptions(settings : DslSettings): this {
        if (!settings)
            throw new Error(`You must pass an object to withOptions()`);
        
        this._settings = settings;
        if (settings.testExecutionSettings)
            this.suite.testExecutionSettings = new TestExecutionSettings(settings.testExecutionSettings);

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
        let results = await this.runForResults();
        
        results.report(this.settings.reporters || DEFAULT_REPORTERS);
        if (this.settings.exitAndReport !== false)
            results.exitAndReport();
    }

    async runForResults(): Promise<TestSuiteResults> {
        return await this.suite.run();
    }
}

export interface DslSettings {
    reporters? : Reporter[];
    exitAndReport? : boolean;
    testExecutionSettings? : TestExecutionSettingsDef;
}

export async function runSuite(paths : string[], options? : DslSettings): Promise<TestSuiteResults> {
    return await (await buildSuite(paths, options)).run();
}

export async function buildSuite(paths : string[], options? : DslSettings, testSuite? : TestSuite): Promise<TestSuite> {
    if (!options) 
        options = {};
    
    // Build the test suite 

    let top = false;

    if (!testSuite)
        testSuite = new TestSuite(new TestExecutionSettings(options.testExecutionSettings));

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
        description = `${parentSubject.description} ${description}`;

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
                testFactory(it);
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

async function itRaw(testDescription : string, func : TestFunction, options? : TestOptions) {
    let subject : TestSubject = Zone.current.get('razminSubject');
    if (!subject)
        throw new Error(`You can only call it() from inside a describe() block.`);
    
    subject.addTest(testDescription, func, options);
}

itRaw['skip'] = (desc, func) => it(desc, func, { skip: true });
itRaw['only'] = (desc, func) => it(desc, func, { only: true });
export const it : TestBuilder = itRaw as any;

async function suiteDeclaration(builder : TestSuiteFactory, settings? : DslSettings): Promise<TestSuiteResults>
{
    if (!settings)
        settings = {};

    // Build the test suite 

    let testSuite : TestSuite;
    let top = false;
    let topLevelSuite = Zone.current.get('razminTestSuite');
    let zone : Zone = Zone.current;

    if (topLevelSuite) {
        testSuite = topLevelSuite;
    } else {
        testSuite = topLevelSuite = new TestSuite(new TestExecutionSettings(settings.testExecutionSettings));
        top = true;
        zone = Zone.current.fork({
            name: 'razminSuiteZone',
            properties: {
                razminTestSuite: testSuite
            },
        });
    }
    
    await new Promise((resolve, reject) => {
        zone.run(async () => {
            try { 
                await builder(describe);
                resolve();
            } catch (e) {
                console.error(`Caught error while building test:`);
                console.error(e);
                reject(e);
            }
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

    results.report(settings.reporters || DEFAULT_REPORTERS);
    if (settings.exitAndReport !== false)
        results.exitAndReport();

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
export async function suite(builder : TestSuiteFactory, settings?: DslSettings): Promise<TestSuiteResults> 
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